import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminPrincipal: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  changeCategoryArchivedState: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  writeLog: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/logging/correlation-id", () => ({
  createCorrelationId: () => "75000000-0000-4000-8000-000000000001",
}));
vi.mock("@/lib/logging/server", () => ({ writeLog: mocks.writeLog }));
vi.mock("@/modules/auth/server", () => ({
  getAdminPrincipal: mocks.getAdminPrincipal,
}));
vi.mock("@/modules/catalog/category-service", () => ({
  createCategory: mocks.createCategory,
  updateCategory: mocks.updateCategory,
  changeCategoryArchivedState: mocks.changeCategoryArchivedState,
}));
vi.mock("@/modules/catalog/category-dal", () => ({
  CategoryRepositoryError: class CategoryRepositoryError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import {
  archiveCategoryAction,
  createCategoryAction,
  updateCategoryAction,
} from "@/modules/catalog/category-actions";
import { CategoryRepositoryError } from "@/modules/catalog/category-dal";

const initialState = { ok: false as const, code: "idle" };

describe("category Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminPrincipal.mockResolvedValue({
      accountId: "admin-account",
      userId: "admin-user",
    });
  });

  it("rejects a direct category mutation without an administrator", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    const result = await createCategoryAction(initialState, validFormData());

    expect(result).toEqual({ ok: false, code: "not_authorized" });
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it("returns field errors before calling the service", async () => {
    const formData = validFormData();
    formData.set("slug", "Invalid Slug");

    const result = await createCategoryAction(initialState, formData);

    expect(result).toMatchObject({
      ok: false,
      code: "validation_failed",
      fieldErrors: { slug: expect.any(Array) },
    });
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it("creates a validated draft and refreshes the category route", async () => {
    mocks.createCategory.mockResolvedValue({
      categoryId: "76000000-0000-4000-8000-000000000001",
      revision: 1,
    });

    await expect(
      createCategoryAction(initialState, validFormData()),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/categories/76000000-0000-4000-8000-000000000001?created=1",
    );
    expect(mocks.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test category",
        slug: "test-category",
        fields: [],
      }),
      expect.any(String),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/categories");
  });

  it("turns a slug race into safe field feedback", async () => {
    mocks.createCategory.mockRejectedValue(
      new CategoryRepositoryError("category_slug_conflict"),
    );

    const result = await createCategoryAction(initialState, validFormData());

    expect(result).toMatchObject({
      ok: false,
      code: "category_slug_conflict",
      fieldErrors: { slug: expect.any(Array) },
    });
  });

  it("preserves optimistic revision failures during updates", async () => {
    mocks.updateCategory.mockRejectedValue(
      new CategoryRepositoryError("category_stale_revision"),
    );
    const formData = validFormData();
    formData.set("categoryId", "76000000-0000-4000-8000-000000000001");
    formData.set("revision", "4");

    const result = await updateCategoryAction(initialState, formData);

    expect(result).toEqual({
      ok: false,
      code: "category_stale_revision",
    });
  });

  it("checks authorization before archiving", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("categoryId", "76000000-0000-4000-8000-000000000001");
    formData.set("revision", "1");

    const result = await archiveCategoryAction(initialState, formData);

    expect(result).toEqual({ ok: false, code: "not_authorized" });
    expect(mocks.changeCategoryArchivedState).not.toHaveBeenCalled();
  });
});

function validFormData() {
  const formData = new FormData();
  formData.set("name", "Test category");
  formData.set("slug", "test-category");
  formData.set("parentCategoryId", "");
  formData.set("description", "");
  formData.set("displayOrder", "10");
  formData.set("fieldSchema", "[]");
  formData.set("seoTitle", "");
  formData.set("seoDescription", "");
  return formData;
}
