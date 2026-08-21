import { z } from "zod";

const fieldKeySchema = z
  .string()
  .trim()
  .min(1, "Enter a field key.")
  .max(50, "Field keys must be 50 characters or fewer.")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Use lowercase letters, numbers, and underscores, starting with a letter.",
  );

const optionSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Enter an option value.")
    .max(50, "Option values must be 50 characters or fewer.")
    .regex(
      /^[a-z0-9][a-z0-9_-]*$/,
      "Use lowercase letters, numbers, underscores, or hyphens.",
    ),
  label: z
    .string()
    .trim()
    .min(1, "Enter an option label.")
    .max(80, "Option labels must be 80 characters or fewer."),
});

const baseFieldShape = {
  key: fieldKeySchema,
  label: z
    .string()
    .trim()
    .min(1, "Enter a field label.")
    .max(80, "Field labels must be 80 characters or fewer."),
  required: z.boolean(),
  filterable: z.boolean(),
};

const simpleFieldSchema = z.object({
  ...baseFieldShape,
  type: z.enum(["text", "number", "boolean"]),
});

const measurementFieldSchema = z.object({
  ...baseFieldShape,
  type: z.literal("measurement"),
  unit: z
    .string()
    .trim()
    .min(1, "Enter a measurement unit.")
    .max(24, "Measurement units must be 24 characters or fewer."),
});

const selectionFieldSchema = z
  .object({
    ...baseFieldShape,
    type: z.enum(["select", "multi_select"]),
    options: z
      .array(optionSchema)
      .min(1, "Add at least one option.")
      .max(30, "A field can contain at most 30 options."),
  })
  .superRefine((field, context) => {
    const values = new Set<string>();

    field.options.forEach((option, index) => {
      if (values.has(option.value)) {
        context.addIssue({
          code: "custom",
          message: "Option values must be unique within a field.",
          path: ["options", index, "value"],
        });
      }
      values.add(option.value);
    });
  });

export const categoryFieldSchema = z.discriminatedUnion("type", [
  simpleFieldSchema,
  measurementFieldSchema,
  selectionFieldSchema,
]);

export const categoryFieldsSchema = z
  .array(categoryFieldSchema)
  .max(20, "A category can contain at most 20 specification fields.")
  .superRefine((fields, context) => {
    const keys = new Set<string>();

    fields.forEach((field, index) => {
      if (keys.has(field.key)) {
        context.addIssue({
          code: "custom",
          message: "Field keys must be unique within a category.",
          path: [index, "key"],
        });
      }
      keys.add(field.key);
    });
  });

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Use ${maximum} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

const categoryDraftShape = {
  name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Use 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Use 80 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens.",
    ),
  parentCategoryId: z
    .union([z.literal(""), z.uuid("Choose a valid parent category.")])
    .transform((value) => (value === "" ? null : value)),
  description: optionalText(1000),
  displayOrder: z.coerce
    .number()
    .int("Display order must be a whole number.")
    .min(0, "Display order cannot be negative.")
    .max(9999, "Display order must be 9999 or less."),
  fieldSchema: z
    .string()
    .max(50_000, "The field schema is too large.")
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({
          code: "custom",
          message: "The specification fields could not be read.",
        });
        return z.NEVER;
      }
    })
    .pipe(categoryFieldsSchema),
  seoTitle: optionalText(70),
  seoDescription: optionalText(180),
};

export const createCategoryFormSchema = z.object(categoryDraftShape);

export const updateCategoryFormSchema = z.object({
  categoryId: z.uuid("Choose a valid category."),
  revision: z.coerce.number().int().nonnegative(),
  ...categoryDraftShape,
});

export const categoryStatusFormSchema = z.object({
  categoryId: z.uuid("Choose a valid category."),
  revision: z.coerce.number().int().nonnegative(),
});

export function categoryFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    parentCategoryId: formData.get("parentCategoryId"),
    description: formData.get("description"),
    displayOrder: formData.get("displayOrder"),
    fieldSchema: formData.get("fieldSchema"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  };
}
