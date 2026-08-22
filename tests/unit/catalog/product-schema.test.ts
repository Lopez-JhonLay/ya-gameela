import { describe, expect, it } from "vitest";

import type { CategoryFieldDTO } from "@/modules/catalog/category-dto";
import type { ProductFormPayloadDTO } from "@/modules/catalog/product-dto";
import {
  priceMajorToMinor,
  priceMinorToMajor,
  productFormPayloadSchema,
  validateProductSpecifications,
} from "@/modules/catalog/product-schema";

describe("product draft schema", () => {
  it("validates a complete option and variant payload", () => {
    const result = productFormPayloadSchema.safeParse(validPayload());

    expect(result.success).toBe(true);
  });

  it("rejects duplicate and incomplete variant combinations", () => {
    const payload = validPayload();
    payload.variants = [
      payload.variants[0],
      { ...payload.variants[0], id: null, sku: "SECOND-SKU" },
      {
        ...payload.variants[0],
        id: null,
        sku: "THIRD-SKU",
        optionValues: {},
      },
    ];

    const result = productFormPayloadSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Each variant combination must be unique.",
          "Choose exactly one value from every option group.",
        ]),
      );
    }
  });

  it("converts two-decimal prices without binary floating-point arithmetic", () => {
    expect(priceMajorToMinor("125.05")).toBe("12505");
    expect(priceMajorToMinor("125.5")).toBe("12550");
    expect(priceMinorToMajor("12505")).toBe("125.05");
    expect(priceMajorToMinor("1.234")).toBeNull();
  });

  it("returns one friendly message for each invalid product input", () => {
    const payload = validPayload();
    payload.variants = [
      { ...payload.variants[0], priceMajor: "12.999" },
      {
        ...payload.variants[0],
        id: null,
        optionValues: { volume: "100ml" },
        priceMajor: "",
      },
    ];
    payload.optionGroups[0].values.push({ key: "100ml", label: "100 ml" });
    payload.mediaAssetIds = [];

    const result = productFormPayloadSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Select at least one product image.");
      expect(
        messages.filter((message) => message.startsWith("Enter a price from")),
      ).toHaveLength(2);
      expect(messages).not.toContain(
        "Too small: expected array to have >=1 items",
      );
    }
  });

  it("explains how to fix a duplicate SKU", () => {
    const payload = validPayload();
    payload.optionGroups[0].values.push({ key: "100ml", label: "100 ml" });
    payload.variants.push({
      ...payload.variants[0],
      id: null,
      optionValues: { volume: "100ml" },
    });

    const result = productFormPayloadSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "This SKU is already used by another variant. Enter a different SKU or leave it blank.",
      );
    }
  });

  it("validates required and controlled category specifications", () => {
    const fields: CategoryFieldDTO[] = [
      {
        key: "volume",
        label: "Volume",
        type: "measurement",
        required: true,
        filterable: true,
        unit: "ml",
      },
      {
        key: "family",
        label: "Family",
        type: "select",
        required: false,
        filterable: true,
        options: [{ value: "floral", label: "Floral" }],
      },
    ];

    expect(
      validateProductSpecifications({ volume: 50, family: "floral" }, fields),
    ).toEqual({});
    expect(validateProductSpecifications({ family: "floral" }, fields)).toEqual(
      {
        specifications: ["Complete the required Volume specification."],
      },
    );
    expect(
      validateProductSpecifications({ volume: 50, family: "unknown" }, fields),
    ).toEqual({ specifications: ["Enter a valid value for Family."] });
  });
});

function validPayload(): ProductFormPayloadDTO {
  return {
    name: "Rose Eau de Parfum",
    slug: "rose-eau-de-parfum",
    categoryId: "71000000-0000-4000-8000-000000000001",
    shortDescription: "A floral fragrance.",
    description: "A complete floral fragrance description.",
    tags: ["floral"],
    specifications: { volume: 50 },
    featured: true,
    isNew: true,
    seoTitle: null,
    seoDescription: null,
    seoSocialMediaAssetId: null,
    baseCurrency: "AED",
    optionGroups: [
      {
        key: "volume",
        name: "Volume",
        values: [{ key: "50ml", label: "50 ml" }],
      },
    ],
    variants: [
      {
        id: null,
        sku: "ROSE-50",
        optionValues: { volume: "50ml" },
        priceMajor: "125.00",
        availability: "available",
      },
    ],
    mediaAssetIds: ["81000000-0000-4000-8000-000000000001"],
    relatedProductIds: [],
  };
}
