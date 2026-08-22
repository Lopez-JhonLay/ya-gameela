import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminPrincipal: vi.fn(),
  getCategoryDrafts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  changeProductArchivedState: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  writeLog: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/logging/correlation-id", () => ({
  createCorrelationId: () => "84000000-0000-4000-8000-000000000001",
}));
vi.mock("@/lib/logging/server", () => ({ writeLog: mocks.writeLog }));
vi.mock("@/modules/auth/server", () => ({
  getAdminPrincipal: mocks.getAdminPrincipal,
}));
vi.mock("@/modules/catalog/category-service", () => ({
  getCategoryDrafts: mocks.getCategoryDrafts,
}));
vi.mock("@/modules/catalog/product-service", () => ({
  createProduct: mocks.createProduct,
  updateProduct: mocks.updateProduct,
  changeProductArchivedState: mocks.changeProductArchivedState,
}));
vi.mock("@/modules/catalog/product-dal", () => ({
  ProductRepositoryError: class ProductRepositoryError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import {
  archiveProductAction,
  createProductAction,
  updateProductAction,
} from "@/modules/catalog/product-actions";
import { ProductRepositoryError } from "@/modules/catalog/product-dal";

const initialState = { ok: false as const, code: "idle" };

describe("product Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminPrincipal.mockResolvedValue({ userId: "admin-user" });
    mocks.getCategoryDrafts.mockResolvedValue([
      {
        id: "71000000-0000-4000-8000-000000000001",
        archived: false,
        fields: [
          {
            key: "volume",
            label: "Volume",
            type: "measurement",
            required: true,
            filterable: true,
            unit: "ml",
          },
        ],
      },
    ]);
  });

  it("rejects direct mutations without an administrator", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    const result = await createProductAction(initialState, validFormData());

    expect(result).toEqual({ ok: false, code: "not_authorized" });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("returns category specification errors before mutation", async () => {
    const formData = validFormData();
    const payload = JSON.parse(String(formData.get("payload")));
    payload.specifications = {};
    formData.set("payload", JSON.stringify(payload));

    const result = await createProductAction(initialState, formData);

    expect(result).toMatchObject({
      ok: false,
      code: "validation_failed",
      fieldErrors: { specifications: expect.any(Array) },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("creates a validated product and redirects to its editor", async () => {
    mocks.createProduct.mockResolvedValue({
      productId: "85000000-0000-4000-8000-000000000001",
      revision: 1,
    });

    await expect(
      createProductAction(initialState, validFormData()),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products/85000000-0000-4000-8000-000000000001?created=1",
    );
    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Rose perfume",
        variants: [
          expect.objectContaining({
            price: { amountMinor: "12500", currency: "AED" },
          }),
        ],
      }),
      expect.any(String),
    );
  });

  it("maps a global SKU race to safe variant feedback", async () => {
    mocks.createProduct.mockRejectedValue(
      new ProductRepositoryError("product_sku_conflict"),
    );

    const result = await createProductAction(initialState, validFormData());

    expect(result).toMatchObject({
      ok: false,
      code: "product_sku_conflict",
      fieldErrors: { variants: expect.any(Array) },
    });
  });

  it("preserves stale revisions during an update", async () => {
    mocks.updateProduct.mockRejectedValue(
      new ProductRepositoryError("product_stale_revision"),
    );
    const formData = validFormData();
    formData.set("productId", "85000000-0000-4000-8000-000000000001");
    formData.set("revision", "4");

    const result = await updateProductAction(initialState, formData);

    expect(result).toEqual({ ok: false, code: "product_stale_revision" });
  });

  it("redirects a successful update to a fresh saved revision", async () => {
    mocks.updateProduct.mockResolvedValue({
      productId: "85000000-0000-4000-8000-000000000001",
      revision: 5,
    });
    const formData = validFormData();
    formData.set("productId", "85000000-0000-4000-8000-000000000001");
    formData.set("revision", "4");

    await expect(updateProductAction(initialState, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products/85000000-0000-4000-8000-000000000001?saved=1",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/products/85000000-0000-4000-8000-000000000001",
    );
  });

  it("returns section-specific friendly validation messages", async () => {
    const formData = validFormData();
    const payload = JSON.parse(String(formData.get("payload")));
    payload.variants[0].priceMajor = "12.999";
    payload.mediaAssetIds = [];
    formData.set("payload", JSON.stringify(payload));

    const result = await createProductAction(initialState, formData);

    expect(result).toMatchObject({
      ok: false,
      code: "validation_failed",
      fieldErrors: {
        variants: [
          "Variant 1: Enter a price from AED 0.01 to AED 99,999,999.99, using no more than 2 decimal places.",
        ],
        mediaAssetIds: ["Select at least one product image."],
      },
    });
  });

  it("checks authorization before archiving", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("productId", "85000000-0000-4000-8000-000000000001");
    formData.set("revision", "1");

    const result = await archiveProductAction(initialState, formData);

    expect(result).toEqual({ ok: false, code: "not_authorized" });
    expect(mocks.changeProductArchivedState).not.toHaveBeenCalled();
  });
});

function validFormData() {
  const formData = new FormData();
  formData.set(
    "payload",
    JSON.stringify({
      name: "Rose perfume",
      slug: "rose-perfume",
      categoryId: "71000000-0000-4000-8000-000000000001",
      shortDescription: "A floral perfume.",
      description: "A complete floral perfume description.",
      tags: ["floral"],
      specifications: { volume: 50 },
      featured: false,
      isNew: true,
      seoTitle: null,
      seoDescription: null,
      seoSocialMediaAssetId: null,
      baseCurrency: "AED",
      optionGroups: [],
      variants: [
        {
          id: null,
          sku: "ROSE-50",
          optionValues: {},
          priceMajor: "125.00",
          availability: "available",
        },
      ],
      mediaAssetIds: ["81000000-0000-4000-8000-000000000001"],
      relatedProductIds: [],
    }),
  );
  return formData;
}
