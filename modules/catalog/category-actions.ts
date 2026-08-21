"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { createCorrelationId } from "@/lib/logging/correlation-id";
import { writeLog } from "@/lib/logging/server";
import { getAdminPrincipal } from "@/modules/auth/server";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
  type FieldErrors,
} from "@/modules/platform";

import type { CategoryDraftCommand, CategoryMutationDTO } from "./category-dto";
import { CategoryRepositoryError } from "./category-dal";
import {
  categoryFormValues,
  categoryStatusFormSchema,
  createCategoryFormSchema,
  updateCategoryFormSchema,
} from "./category-schema";
import {
  changeCategoryArchivedState,
  createCategory,
  updateCategory,
} from "./category-service";

export type CategoryActionState = ActionResult<CategoryMutationDTO>;

export async function createCategoryAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const principal = await getAdminPrincipal();

  if (!principal) {
    return actionFailure("not_authorized");
  }

  const parsed = createCategoryFormSchema.safeParse(
    categoryFormValues(formData),
  );

  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  const result = await runCategoryMutation("create", correlationId, () =>
    createCategory(toCommand(parsed.data), correlationId),
  );

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/categories");
  redirect(`/admin/categories/${result.data.categoryId}?created=1`);
}

export async function updateCategoryAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const principal = await getAdminPrincipal();

  if (!principal) {
    return actionFailure("not_authorized");
  }

  const parsed = updateCategoryFormSchema.safeParse({
    categoryId: formData.get("categoryId"),
    revision: formData.get("revision"),
    ...categoryFormValues(formData),
  });

  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  const result = await runCategoryMutation("update", correlationId, () =>
    updateCategory(
      parsed.data.categoryId,
      parsed.data.revision,
      toCommand(parsed.data),
      correlationId,
    ),
  );

  if (result.ok) {
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${parsed.data.categoryId}`);
  }

  return result;
}

export async function archiveCategoryAction(
  previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  return categoryStatusAction(previousState, formData, true);
}

export async function restoreCategoryAction(
  previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  return categoryStatusAction(previousState, formData, false);
}

async function categoryStatusAction(
  _previousState: CategoryActionState,
  formData: FormData,
  archived: boolean,
): Promise<CategoryActionState> {
  const principal = await getAdminPrincipal();

  if (!principal) {
    return actionFailure("not_authorized");
  }

  const parsed = categoryStatusFormSchema.safeParse({
    categoryId: formData.get("categoryId"),
    revision: formData.get("revision"),
  });

  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  const result = await runCategoryMutation(
    archived ? "archive" : "restore",
    correlationId,
    () =>
      changeCategoryArchivedState(
        parsed.data.categoryId,
        parsed.data.revision,
        archived,
        correlationId,
      ),
  );

  if (result.ok) {
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${parsed.data.categoryId}`);
  }

  return result;
}

async function runCategoryMutation(
  operation: "create" | "update" | "archive" | "restore",
  correlationId: string,
  mutation: () => Promise<CategoryMutationDTO>,
): Promise<CategoryActionState> {
  try {
    return actionSuccess(await mutation());
  } catch (error) {
    const code =
      error instanceof CategoryRepositoryError
        ? error.code
        : "category_mutation_failed";

    writeLog({
      severity: "error",
      event: "category.mutation_failed",
      correlationId,
      context: { outcome: operation, errorCode: code },
    });

    return databaseFailure(code);
  }
}

function databaseFailure(code: string): CategoryActionState {
  if (code === "category_slug_conflict") {
    return actionFailure(code, {
      slug: ["This slug is already reserved by another category."],
    });
  }

  if (
    code === "category_parent_self" ||
    code === "category_parent_unavailable" ||
    code === "category_depth_exceeded" ||
    code === "category_has_children"
  ) {
    return actionFailure(code, {
      parentCategoryId: [categoryMessage(code)],
    });
  }

  return actionFailure(code);
}

function categoryMessage(code: string) {
  const messages: Record<string, string> = {
    category_parent_self: "A category cannot be its own parent.",
    category_parent_unavailable: "Choose an active top-level category.",
    category_depth_exceeded: "Categories can only have two levels.",
    category_has_children:
      "Reassign or archive this category's active subcategories first.",
  };

  return messages[code] ?? "Choose a valid parent category.";
}

function fieldErrors(error: ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    errors[field] = [...(errors[field] ?? []), issue.message];
    return errors;
  }, {});
}

function toCommand(input: {
  name: string;
  slug: string;
  parentCategoryId: string | null;
  description: string | null;
  displayOrder: number;
  fieldSchema: CategoryDraftCommand["fields"];
  seoTitle: string | null;
  seoDescription: string | null;
}): CategoryDraftCommand {
  return {
    name: input.name,
    slug: input.slug,
    parentCategoryId: input.parentCategoryId,
    description: input.description,
    displayOrder: input.displayOrder,
    fields: input.fieldSchema,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}
