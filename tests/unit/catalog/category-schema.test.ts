import { describe, expect, it } from "vitest";

import {
  categoryFieldsSchema,
  createCategoryFormSchema,
} from "@/modules/catalog/category-schema";

describe("category field schema", () => {
  it("accepts every supported specification field type", () => {
    const result = categoryFieldsSchema.safeParse([
      {
        key: "description",
        label: "Description",
        type: "text",
        required: false,
        filterable: false,
      },
      {
        key: "rating",
        label: "Rating",
        type: "number",
        required: false,
        filterable: true,
      },
      {
        key: "volume",
        label: "Volume",
        type: "measurement",
        required: true,
        filterable: true,
        unit: "ml",
      },
      {
        key: "gift_ready",
        label: "Gift ready",
        type: "boolean",
        required: false,
        filterable: true,
      },
      {
        key: "family",
        label: "Family",
        type: "select",
        required: false,
        filterable: true,
        options: [{ value: "floral", label: "Floral" }],
      },
      {
        key: "colors",
        label: "Colors",
        type: "multi_select",
        required: false,
        filterable: true,
        options: [{ value: "rose", label: "Rose" }],
      },
    ]);

    expect(result.success).toBe(true);
  });

  it("rejects duplicate field keys and controlled option values", () => {
    const duplicateKeys = categoryFieldsSchema.safeParse([
      {
        key: "color",
        label: "Color",
        type: "text",
        required: false,
        filterable: false,
      },
      {
        key: "color",
        label: "Colour",
        type: "text",
        required: false,
        filterable: false,
      },
    ]);
    const duplicateOptions = categoryFieldsSchema.safeParse([
      {
        key: "color",
        label: "Color",
        type: "select",
        required: false,
        filterable: true,
        options: [
          { value: "rose", label: "Rose" },
          { value: "rose", label: "Rose pink" },
        ],
      },
    ]);

    expect(duplicateKeys.success).toBe(false);
    expect(duplicateOptions.success).toBe(false);
  });

  it("normalizes valid form values and rejects malformed JSON", () => {
    const valid = createCategoryFormSchema.safeParse({
      name: "  Perfumes  ",
      slug: "PERFUMES",
      parentCategoryId: "",
      description: "",
      displayOrder: "10",
      fieldSchema: "[]",
      seoTitle: "",
      seoDescription: "",
    });
    const invalid = createCategoryFormSchema.safeParse({
      name: "Perfumes",
      slug: "perfumes",
      parentCategoryId: "",
      description: "",
      displayOrder: "10",
      fieldSchema: "not-json",
      seoTitle: "",
      seoDescription: "",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data).toMatchObject({
        name: "Perfumes",
        slug: "perfumes",
        parentCategoryId: null,
        description: null,
        displayOrder: 10,
        fieldSchema: [],
      });
    }
    expect(invalid.success).toBe(false);
  });
});
