import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  remove: vi.fn(),
  getMediaInspectionRecord: vi.fn(),
  finalizeMediaUploadRecord: vi.fn(),
  rejectMediaUploadRecord: vi.fn(),
  requestMediaDeletionRecord: vi.fn(),
  completeMediaDeletionRecord: vi.fn(),
}));

vi.mock("@/lib/supabase/system", () => ({
  createSystemSupabaseClient: () => ({
    storage: {
      from: () => ({ download: mocks.download, remove: mocks.remove }),
    },
  }),
}));

vi.mock("@/modules/media/dal", () => ({
  beginMediaUploadRecord: vi.fn(),
  listMediaLibraryRecords: vi.fn(),
  updateMediaMetadataRecord: vi.fn(),
  getMediaInspectionRecord: mocks.getMediaInspectionRecord,
  finalizeMediaUploadRecord: mocks.finalizeMediaUploadRecord,
  rejectMediaUploadRecord: mocks.rejectMediaUploadRecord,
  requestMediaDeletionRecord: mocks.requestMediaDeletionRecord,
  completeMediaDeletionRecord: mocks.completeMediaDeletionRecord,
}));

import {
  deleteMedia,
  inspectImageBytes,
  MediaServiceError,
  verifyMediaUpload,
} from "@/modules/media/service";

describe("media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rejectMediaUploadRecord.mockResolvedValue({
      mediaId: "media-id",
      status: "rejected",
    });
    mocks.finalizeMediaUploadRecord.mockResolvedValue({
      mediaId: "media-id",
      status: "ready",
    });
    mocks.completeMediaDeletionRecord.mockResolvedValue({
      mediaId: "media-id",
      status: "deleting",
    });
  });

  it.each([
    ["jpg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
    ["avif", "image/avif"],
  ] as const)("inspects real %s bytes", async (format, mimeType) => {
    const image = sharp({
      create: {
        width: 24,
        height: 16,
        channels: 4,
        background: { r: 220, g: 180, b: 190, alpha: 1 },
      },
    });
    const bytes = await image[format === "jpg" ? "jpeg" : format]().toBuffer();

    const result = await inspectImageBytes(bytes, format);

    expect(result).toMatchObject({
      mimeType,
      width: 24,
      height: 16,
      byteSize: bytes.length,
    });
    expect(result.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects HTML, SVG, and extension-signature mismatches", async () => {
    await expect(
      inspectImageBytes(Buffer.from("<html>not an image</html>"), "jpg"),
    ).rejects.toMatchObject({ code: "media_signature_invalid" });
    await expect(
      inspectImageBytes(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        "png",
      ),
    ).rejects.toMatchObject({ code: "media_signature_invalid" });

    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: "white",
      },
    })
      .png()
      .toBuffer();
    await expect(inspectImageBytes(png, "jpg")).rejects.toMatchObject({
      code: "media_signature_invalid",
    });
  });

  it("finalizes only after downloading and inspecting the stored object", async () => {
    const png = await sharp({
      create: {
        width: 10,
        height: 8,
        channels: 3,
        background: "white",
      },
    })
      .png()
      .toBuffer();
    mocks.getMediaInspectionRecord.mockResolvedValue({
      id: "media-id",
      objectPath: "originals/media-id.png",
      originalExtension: "png",
      status: "pending",
    });
    mocks.download.mockResolvedValue({
      data: { arrayBuffer: async () => png },
      error: null,
    });

    await expect(
      verifyMediaUpload("media-id", "correlation-id"),
    ).resolves.toMatchObject({ status: "ready" });
    expect(mocks.finalizeMediaUploadRecord).toHaveBeenCalledWith(
      "media-id",
      expect.objectContaining({ mimeType: "image/png", width: 10, height: 8 }),
      "correlation-id",
    );
  });

  it("rejects and removes a spoofed stored object", async () => {
    mocks.getMediaInspectionRecord.mockResolvedValue({
      id: "media-id",
      objectPath: "originals/media-id.jpg",
      originalExtension: "jpg",
      status: "pending",
    });
    mocks.download.mockResolvedValue({
      data: { arrayBuffer: async () => Buffer.from("<html></html>") },
      error: null,
    });

    await expect(
      verifyMediaUpload("media-id", "correlation-id"),
    ).rejects.toMatchObject({ code: "media_signature_invalid" });
    expect(mocks.rejectMediaUploadRecord).toHaveBeenCalledWith(
      "media-id",
      "media_signature_invalid",
      "correlation-id",
    );
    expect(mocks.remove).toHaveBeenCalledWith(["originals/media-id.jpg"]);
  });

  it("keeps a valid object pending when database finalization fails", async () => {
    const png = await sharp({
      create: {
        width: 10,
        height: 8,
        channels: 3,
        background: "white",
      },
    })
      .png()
      .toBuffer();
    mocks.getMediaInspectionRecord.mockResolvedValue({
      id: "media-id",
      objectPath: "originals/media-id.png",
      originalExtension: "png",
      status: "pending",
    });
    mocks.download.mockResolvedValue({
      data: { arrayBuffer: async () => png },
      error: null,
    });
    mocks.finalizeMediaUploadRecord.mockRejectedValue(
      new Error("temporary database failure"),
    );

    await expect(
      verifyMediaUpload("media-id", "correlation-id"),
    ).rejects.toThrow("temporary database failure");
    expect(mocks.rejectMediaUploadRecord).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("does not call Storage when the database blocks referenced deletion", async () => {
    mocks.getMediaInspectionRecord.mockResolvedValue({
      id: "media-id",
      objectPath: "originals/media-id.png",
      originalExtension: "png",
      status: "ready",
    });
    mocks.requestMediaDeletionRecord.mockRejectedValue(
      new MediaServiceError("media_still_referenced"),
    );

    await expect(
      deleteMedia("media-id", "correlation-id"),
    ).rejects.toMatchObject({ code: "media_still_referenced" });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.completeMediaDeletionRecord).not.toHaveBeenCalled();
  });

  it("removes the Storage object before completing metadata deletion", async () => {
    mocks.getMediaInspectionRecord.mockResolvedValue({
      id: "media-id",
      objectPath: "originals/media-id.png",
      originalExtension: "png",
      status: "ready",
    });
    mocks.requestMediaDeletionRecord.mockResolvedValue({
      mediaId: "media-id",
      status: "deleting",
    });

    await deleteMedia("media-id", "correlation-id");

    expect(mocks.remove).toHaveBeenCalledWith(["originals/media-id.png"]);
    expect(mocks.completeMediaDeletionRecord).toHaveBeenCalledWith(
      "media-id",
      "correlation-id",
    );
  });
});
