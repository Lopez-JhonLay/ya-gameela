import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminPrincipal: vi.fn(),
  beginMediaUpload: vi.fn(),
  verifyMediaUpload: vi.fn(),
  updateMediaMetadata: vi.fn(),
  deleteMedia: vi.fn(),
  revalidatePath: vi.fn(),
  writeLog: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/logging/correlation-id", () => ({
  createCorrelationId: () => "89000000-0000-4000-8000-000000000001",
}));
vi.mock("@/lib/logging/server", () => ({ writeLog: mocks.writeLog }));
vi.mock("@/modules/auth/server", () => ({
  getAdminPrincipal: mocks.getAdminPrincipal,
}));
vi.mock("@/modules/media/dal", () => ({
  MediaRepositoryError: class MediaRepositoryError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));
vi.mock("@/modules/media/service", () => ({
  MediaServiceError: class MediaServiceError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
  beginMediaUpload: mocks.beginMediaUpload,
  verifyMediaUpload: mocks.verifyMediaUpload,
  updateMediaMetadata: mocks.updateMediaMetadata,
  deleteMedia: mocks.deleteMedia,
}));

import {
  beginMediaUploadAction,
  deleteMediaAction,
  finalizeMediaUploadAction,
  updateMediaMetadataAction,
} from "@/modules/media/actions";
import { MediaRepositoryError } from "@/modules/media/dal";

const initialState = { ok: false as const, code: "idle" };

describe("media Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminPrincipal.mockResolvedValue({
      accountId: "admin-account",
      userId: "admin-user",
    });
  });

  it("rejects upload preparation without an administrator", async () => {
    mocks.getAdminPrincipal.mockResolvedValue(null);

    const result = await beginMediaUploadAction(validUpload());

    expect(result).toEqual({ ok: false, code: "not_authorized" });
    expect(mocks.beginMediaUpload).not.toHaveBeenCalled();
  });

  it("rejects spoofed upload metadata before creating a database record", async () => {
    const result = await beginMediaUploadAction({
      ...validUpload(),
      declaredMimeType: "text/html",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "validation_failed",
      fieldErrors: { declaredMimeType: expect.any(Array) },
    });
    expect(mocks.beginMediaUpload).not.toHaveBeenCalled();
  });

  it("prepares and finalizes a valid upload", async () => {
    mocks.beginMediaUpload.mockResolvedValue({
      mediaId: "8a000000-0000-4000-8000-000000000001",
      objectPath: "originals/8a000000-0000-4000-8000-000000000001.png",
      bucketName: "media",
    });
    mocks.verifyMediaUpload.mockResolvedValue({
      mediaId: "8a000000-0000-4000-8000-000000000001",
      status: "ready",
    });

    await expect(beginMediaUploadAction(validUpload())).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      finalizeMediaUploadAction("8a000000-0000-4000-8000-000000000001"),
    ).resolves.toMatchObject({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/media");
  });

  it("validates metadata updates and maps reference deletion errors safely", async () => {
    const invalidForm = new FormData();
    invalidForm.set("mediaId", "8a000000-0000-4000-8000-000000000001");
    invalidForm.set("altText", "  ");
    invalidForm.set("sourceAttribution", "");

    await expect(
      updateMediaMetadataAction(initialState, invalidForm),
    ).resolves.toMatchObject({ ok: false, code: "validation_failed" });

    mocks.deleteMedia.mockRejectedValue(
      new MediaRepositoryError("media_still_referenced"),
    );
    const deleteForm = new FormData();
    deleteForm.set("mediaId", "8a000000-0000-4000-8000-000000000001");

    await expect(deleteMediaAction(initialState, deleteForm)).resolves.toEqual({
      ok: false,
      code: "media_still_referenced",
    });
    expect(mocks.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "media.mutation_failed",
        context: expect.objectContaining({
          errorCode: "media_still_referenced",
        }),
      }),
    );
  });
});

function validUpload() {
  return {
    extension: "png",
    declaredMimeType: "image/png",
    byteSize: 2048,
    altText: "A useful product image description",
    sourceAttribution: null,
  };
}
