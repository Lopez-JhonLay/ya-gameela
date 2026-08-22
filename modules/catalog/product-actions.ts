"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError, ZodIssue } from "zod";

import { createCorrelationId } from "@/lib/logging/correlation-id";
import { writeLog } from "@/lib/logging/server";
import { getAdminPrincipal } from "@/modules/auth/server";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
  type FieldErrors,
} from "@/modules/platform";

import { getCategoryDrafts } from "./category-service";
import { ProductRepositoryError } from "./product-dal";
import type {
  ProductDraftCommand,
  ProductFormPayloadDTO,
  ProductMutationDTO,
} from "./product-dto";
import { productErrorMessage } from "./product-messages";
import {
  productFormPayloadSchema,
  productPayloadJsonSchema,
  productStatusFormSchema,
  toProductDraftCommand,
  validateProductSpecifications,
} from "./product-schema";
import {
  changeProductArchivedState,
  createProduct,
  updateProduct,
} from "./product-service";

export type ProductActionState = ActionResult<ProductMutationDTO>;

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const command = await validatedCommand(formData);
  if (!command.ok) {
    return command;
  }

  const correlationId = createCorrelationId();
  const result = await runProductMutation("create", correlationId, () =>
    createProduct(command.data, correlationId),
  );

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${result.data.productId}?created=1`);
}

export async function updateProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const identity = productStatusFormSchema.safeParse({
    productId: formData.get("productId"),
    revision: formData.get("revision"),
  });
  if (!identity.success) {
    return actionFailure("validation_failed", fieldErrors(identity.error));
  }

  const command = await validatedCommand(formData);
  if (!command.ok) {
    return command;
  }

  const correlationId = createCorrelationId();
  const result = await runProductMutation("update", correlationId, () =>
    updateProduct(
      identity.data.productId,
      identity.data.revision,
      command.data,
      correlationId,
    ),
  );

  if (result.ok) {
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${identity.data.productId}`);
    redirect(`/admin/products/${identity.data.productId}?saved=1`);
  }
  return result;
}

export async function archiveProductAction(
  previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return productStatusAction(previousState, formData, true);
}

export async function restoreProductAction(
  previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return productStatusAction(previousState, formData, false);
}

async function productStatusAction(
  _previousState: ProductActionState,
  formData: FormData,
  archived: boolean,
): Promise<ProductActionState> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const parsed = productStatusFormSchema.safeParse({
    productId: formData.get("productId"),
    revision: formData.get("revision"),
  });
  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  const result = await runProductMutation(
    archived ? "archive" : "restore",
    correlationId,
    () =>
      changeProductArchivedState(
        parsed.data.productId,
        parsed.data.revision,
        archived,
        correlationId,
      ),
  );

  if (result.ok) {
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.productId}`);
  }
  return result;
}

async function validatedCommand(
  formData: FormData,
): Promise<ActionResult<ProductDraftCommand>> {
  const json = productPayloadJsonSchema.safeParse(formData.get("payload"));
  if (!json.success) {
    return actionFailure("validation_failed", {
      form: ["The product form data could not be read. Refresh and try again."],
    });
  }

  const parsed = productFormPayloadSchema.safeParse(json.data);
  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const categories = await getCategoryDrafts();
  const category = categories.find(
    (item) => item.id === parsed.data.categoryId && !item.archived,
  );
  if (!category) {
    return actionFailure("product_category_unavailable", {
      categoryId: ["Choose an active category."],
    });
  }

  const specificationErrors = validateProductSpecifications(
    parsed.data.specifications,
    category.fields,
  );
  if (Object.keys(specificationErrors).length > 0) {
    return actionFailure("validation_failed", specificationErrors);
  }

  return actionSuccess(
    toProductDraftCommand(parsed.data satisfies ProductFormPayloadDTO),
  );
}

async function runProductMutation(
  operation: "create" | "update" | "archive" | "restore",
  correlationId: string,
  mutation: () => Promise<ProductMutationDTO>,
): Promise<ProductActionState> {
  try {
    return actionSuccess(await mutation());
  } catch (error) {
    const code =
      error instanceof ProductRepositoryError
        ? error.code
        : "product_mutation_failed";
    writeLog({
      severity: "error",
      event: "product.mutation_failed",
      correlationId,
      context: { outcome: operation, errorCode: code },
    });
    return productDatabaseFailure(code);
  }
}

function productDatabaseFailure(code: string): ProductActionState {
  const fieldByCode: Record<string, string> = {
    product_category_unavailable: "categoryId",
    product_media_invalid: "mediaAssetIds",
    product_option_groups_invalid: "optionGroups",
    product_relations_invalid: "relatedProductIds",
    product_seo_media_invalid: "seoSocialMediaAssetId",
    product_sku_conflict: "variants",
    product_slug_conflict: "slug",
    product_specifications_invalid: "specifications",
    product_tags_invalid: "tags",
    product_variant_combination_duplicate: "variants",
    product_variant_identity_invalid: "variants",
    product_variant_option_invalid: "variants",
    product_variant_options_incomplete: "variants",
    product_variants_invalid: "variants",
  };
  const field = fieldByCode[code];
  return field
    ? actionFailure(code, { [field]: [productErrorMessage(code)] })
    : actionFailure(code);
}

function fieldErrors(error: ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    const message = friendlyIssueMessage(issue);
    if (!errors[field]?.includes(message)) {
      errors[field] = [...(errors[field] ?? []), message];
    }
    return errors;
  }, {});
}

function friendlyIssueMessage(issue: ZodIssue): string {
  const [section, index] = issue.path;
  if (section === "variants" && typeof index === "number") {
    return `Variant ${index + 1}: ${issue.message}`;
  }
  if (section === "optionGroups" && typeof index === "number") {
    return `Option group ${index + 1}: ${issue.message}`;
  }
  return issue.message;
}
