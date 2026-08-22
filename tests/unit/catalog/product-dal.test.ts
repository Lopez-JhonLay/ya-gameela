import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminPrincipal: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/modules/auth/server", () => ({
  getAdminPrincipal: mocks.getAdminPrincipal,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  createProductDraftRecord,
  listProductDraftRecords,
  ProductRepositoryError,
} from "@/modules/catalog/product-dal";
import type { ProductDraftCommand } from "@/modules/catalog/product-dto";

describe("product DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reads before querying without an administrator", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    await expect(listProductDraftRecords()).rejects.toEqual(
      new ProductRepositoryError("product_not_authorized"),
    );
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns an empty minimal collection for an authorized empty catalog", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.getAdminPrincipal.mockResolvedValue({ userId: "admin-user" });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(listProductDraftRecords()).resolves.toEqual([]);
    expect(select).toHaveBeenCalledWith(
      "id, current_draft_version_id, current_published_version_id, draft_revision, archived_at, updated_at",
    );
  });

  it("maps controlled SKU conflicts without exposing database messages", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "P0001 product_sku_conflict internal context" },
    });
    mocks.getAdminPrincipal.mockResolvedValue({ userId: "admin-user" });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(
      createProductDraftRecord(
        command(),
        "84000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toEqual(new ProductRepositoryError("product_sku_conflict"));
  });
});

function command(): ProductDraftCommand {
  return {
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
        price: { amountMinor: "12500", currency: "AED" },
        availability: "available",
      },
    ],
    mediaAssetIds: ["81000000-0000-4000-8000-000000000001"],
    relatedProductIds: [],
  };
}
