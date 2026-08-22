import { z } from "zod";

import type { CategoryFieldDTO } from "./category-dto";
import {
  productAvailabilityValues,
  productBaseCurrencies,
  type ProductDraftCommand,
  type ProductFormPayloadDTO,
} from "./product-dto";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters.")
  .max(120, "Use no more than 120 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens.",
  );

const nullableText = (maximum: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.string().max(maximum).nullable());

const optionValueSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{0,49}$/, "Use a valid option value key."),
  label: z.string().trim().min(1).max(80),
});

const optionGroupSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{0,39}$/, "Use a valid option group key."),
  name: z.string().trim().min(1).max(50),
  values: z.array(optionValueSchema).min(1).max(20),
});

const variantSchema = z.object({
  id: z.uuid().nullable(),
  sku: nullableText(64).refine(
    (value) =>
      value === null || /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/.test(value),
    "Use letters, numbers, dots, underscores, slashes, or hyphens.",
  ),
  optionValues: z.record(z.string(), z.string()),
  priceMajor: z.string().trim(),
  availability: z.enum(productAvailabilityValues),
});

export const productFormPayloadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    categoryId: z.uuid(),
    shortDescription: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(5000),
    tags: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase tag slugs."),
      )
      .max(20),
    specifications: z.record(z.string(), z.unknown()),
    featured: z.boolean(),
    isNew: z.boolean(),
    seoTitle: nullableText(70),
    seoDescription: nullableText(180),
    seoSocialMediaAssetId: z.uuid().nullable(),
    baseCurrency: z.enum(productBaseCurrencies),
    optionGroups: z.array(optionGroupSchema).max(3),
    variants: z
      .array(variantSchema)
      .min(1, "Add at least one product variant.")
      .max(100, "A product can have no more than 100 variants."),
    mediaAssetIds: z
      .array(z.uuid())
      .min(1, "Select at least one product image.")
      .max(12, "Select no more than 12 product images."),
    relatedProductIds: z.array(z.uuid()).max(12),
  })
  .superRefine((payload, context) => {
    uniqueValues(payload.tags, "tags", context);
    uniqueValues(payload.mediaAssetIds, "mediaAssetIds", context);
    uniqueValues(payload.relatedProductIds, "relatedProductIds", context);

    const groupKeys = payload.optionGroups.map((group) => group.key);
    uniqueValues(groupKeys, "optionGroups", context);

    for (const [groupIndex, group] of payload.optionGroups.entries()) {
      uniqueValues(
        group.values.map((value) => value.key),
        `optionGroups.${groupIndex}.values`,
        context,
      );
    }

    const signatures = new Set<string>();
    const variantIds = new Set<string>();
    const skus = new Set<string>();
    const groupsByKey = new Map(
      payload.optionGroups.map((group) => [
        group.key,
        new Set(group.values.map((value) => value.key)),
      ]),
    );

    for (const [variantIndex, variant] of payload.variants.entries()) {
      const optionKeys = Object.keys(variant.optionValues).sort();
      const expectedKeys = [...groupKeys].sort();

      if (
        optionKeys.length !== expectedKeys.length ||
        optionKeys.some((key, index) => key !== expectedKeys[index])
      ) {
        context.addIssue({
          code: "custom",
          path: ["variants", variantIndex, "optionValues"],
          message: "Choose exactly one value from every option group.",
        });
      }

      for (const [groupKey, valueKey] of Object.entries(variant.optionValues)) {
        if (!groupsByKey.get(groupKey)?.has(valueKey)) {
          context.addIssue({
            code: "custom",
            path: ["variants", variantIndex, "optionValues"],
            message: "Choose values defined by this product's option groups.",
          });
        }
      }

      const signature = optionKeys
        .map((key) => `${key}=${variant.optionValues[key]}`)
        .join("|");
      if (signatures.has(signature)) {
        context.addIssue({
          code: "custom",
          path: ["variants", variantIndex, "optionValues"],
          message: "Each variant combination must be unique.",
        });
      }
      signatures.add(signature);

      if (variant.id) {
        if (variantIds.has(variant.id)) {
          context.addIssue({
            code: "custom",
            path: ["variants", variantIndex, "id"],
            message: "A stable variant can only appear once.",
          });
        }
        variantIds.add(variant.id);
      }

      if (variant.sku) {
        const normalizedSku = variant.sku.toLowerCase();
        if (skus.has(normalizedSku)) {
          context.addIssue({
            code: "custom",
            path: ["variants", variantIndex, "sku"],
            message:
              "This SKU is already used by another variant. Enter a different SKU or leave it blank.",
          });
        }
        skus.add(normalizedSku);
      }

      const minor = priceMajorToMinor(variant.priceMajor);
      if (
        minor === null ||
        BigInt(minor) < BigInt(1) ||
        BigInt(minor) > BigInt(9_999_999_999)
      ) {
        context.addIssue({
          code: "custom",
          path: ["variants", variantIndex, "priceMajor"],
          message: `Enter a price from ${payload.baseCurrency} 0.01 to ${payload.baseCurrency} 99,999,999.99, using no more than 2 decimal places.`,
        });
      }
    }
  });

export const productPayloadJsonSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({
        code: "custom",
        message: "The product form data is invalid.",
      });
      return z.NEVER;
    }
  });

export const productStatusFormSchema = z.object({
  productId: z.uuid(),
  revision: z.coerce.number().int().nonnegative(),
});

export function validateProductSpecifications(
  specifications: Record<string, unknown>,
  fields: CategoryFieldDTO[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

  for (const key of Object.keys(specifications)) {
    if (!fieldsByKey.has(key)) {
      errors.specifications = [
        "Remove specifications not defined by the selected category.",
      ];
      return errors;
    }
  }

  for (const field of fields) {
    const value = specifications[field.key];
    const missing = value === undefined || value === null || value === "";
    if (missing) {
      if (field.required) {
        errors.specifications = [
          `Complete the required ${field.label} specification.`,
        ];
        return errors;
      }
      continue;
    }

    const valid = specificationValueIsValid(value, field);
    if (!valid) {
      errors.specifications = [`Enter a valid value for ${field.label}.`];
      return errors;
    }
  }

  return errors;
}

export function toProductDraftCommand(
  payload: ProductFormPayloadDTO,
): ProductDraftCommand {
  return {
    ...payload,
    variants: payload.variants.map(({ priceMajor, ...variant }) => ({
      ...variant,
      price: {
        amountMinor: priceMajorToMinor(priceMajor)!,
        currency: payload.baseCurrency,
      },
    })),
  };
}

export function priceMajorToMinor(value: string): string | null {
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const whole = match[1];
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return (BigInt(whole) * BigInt(100) + BigInt(fraction || "0")).toString();
}

export function priceMinorToMajor(value: string): string {
  const amount = BigInt(value);
  const whole = amount / BigInt(100);
  const fraction = (amount % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

function uniqueValues(
  values: string[],
  path: string,
  context: z.RefinementCtx,
) {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: "custom",
      path: path.split("."),
      message: "Remove duplicate values.",
    });
  }
}

function specificationValueIsValid(value: unknown, field: CategoryFieldDTO) {
  if (field.type === "text") {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 500
    );
  }
  if (field.type === "number" || field.type === "measurement") {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Math.abs(value) <= 1e12
    );
  }
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }
  if (field.type === "select") {
    return (
      typeof value === "string" &&
      field.options?.some((option) => option.value === value) === true
    );
  }
  if (field.type === "multi_select") {
    return (
      Array.isArray(value) &&
      (!field.required || value.length > 0) &&
      value.length <= 30 &&
      new Set(value).size === value.length &&
      value.every(
        (entry) =>
          typeof entry === "string" &&
          field.options?.some((option) => option.value === entry) === true,
      )
    );
  }
  return false;
}
