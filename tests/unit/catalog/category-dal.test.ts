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
  CategoryRepositoryError,
  listCategoryDrafts,
} from "@/modules/catalog/category-dal";

describe("category DAL authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects direct reads before querying without an administrator", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    await expect(listCategoryDrafts()).rejects.toEqual(
      new CategoryRepositoryError("category_not_authorized"),
    );
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns a minimal empty collection for an authorized empty catalog", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.getAdminPrincipal.mockResolvedValue({
      accountId: "admin-account",
      userId: "admin-user",
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(listCategoryDrafts()).resolves.toEqual([]);
    expect(select).toHaveBeenCalledWith(
      "id, current_draft_version_id, current_published_version_id, draft_revision, archived_at, updated_at",
    );
  });
});
