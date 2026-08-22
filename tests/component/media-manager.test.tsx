import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  beginMediaUploadAction: vi.fn(),
  finalizeMediaUploadAction: vi.fn(),
  uploadMediaObject: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/modules/media/actions", () => ({
  beginMediaUploadAction: mocks.beginMediaUploadAction,
  finalizeMediaUploadAction: mocks.finalizeMediaUploadAction,
  updateMediaMetadataAction: vi.fn(),
  deleteMediaAction: vi.fn(),
}));
vi.mock("@/modules/media/upload-client", () => ({
  uploadMediaObject: mocks.uploadMediaObject,
}));

import { MediaManager } from "@/modules/media/media-manager";
import { mediaMaxBytes, type MediaAssetDTO } from "@/modules/media/dto";

describe("media CMS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders responsive verified images and blocks referenced deletion", () => {
    render(
      <MediaManager
        assets={[mediaAsset({ referenceCount: 2 })]}
        issues={[
          {
            mediaAssetId: "8a000000-0000-4000-8000-000000000001",
            objectPath: "originals/8a000000-0000-4000-8000-000000000001.png",
            issueCode: "ready_object_missing",
            detectedFrom: "2026-08-21T00:00:00Z",
          },
        ]}
      />,
    );

    const image = screen.getByRole("img", {
      name: "A perfume bottle on a neutral background",
    });
    expect(image).toHaveAttribute(
      "sizes",
      "(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw",
    );
    expect(screen.getByRole("button", { name: "Delete image" })).toBeDisabled();
    expect(screen.getByText("Used in 2 saved versions")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This image is part of saved content history and cannot be deleted.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Verified metadata has no Storage object/),
    ).toBeInTheDocument();
  });

  it("requires useful upload fields and completes the protected flow", async () => {
    const user = userEvent.setup();
    mocks.beginMediaUploadAction.mockResolvedValue({
      ok: true,
      data: {
        mediaId: "8a000000-0000-4000-8000-000000000002",
        objectPath: "originals/8a000000-0000-4000-8000-000000000002.png",
        bucketName: "media",
      },
    });
    mocks.uploadMediaObject.mockImplementation(
      async (_file: File, _path: string, progress: (value: number) => void) =>
        progress(100),
    );
    mocks.finalizeMediaUploadAction.mockResolvedValue({
      ok: true,
      data: {
        mediaId: "8a000000-0000-4000-8000-000000000002",
        status: "ready",
      },
    });

    render(<MediaManager assets={[]} issues={[]} />);

    expect(screen.getByLabelText(/^Alternative text/)).toBeRequired();
    await user.upload(
      screen.getByLabelText("Image file"),
      new File(["image"], "perfume.png", { type: "image/png" }),
    );
    await user.type(
      screen.getByLabelText(/^Alternative text/),
      "A perfume bottle on a blush background",
    );
    const uploadButton = screen.getByRole("button", { name: "Upload image" });
    const uploadForm = uploadButton.closest("form");
    expect(uploadForm).not.toBeNull();
    fireEvent.submit(uploadForm!);

    await waitFor(() =>
      expect(
        screen.getByText("Image uploaded and verified."),
      ).toBeInTheDocument(),
    );
    expect(mocks.uploadMediaObject).toHaveBeenCalledWith(
      expect.any(File),
      "originals/8a000000-0000-4000-8000-000000000002.png",
      expect.any(Function),
    );
    expect(mocks.finalizeMediaUploadAction).toHaveBeenCalledWith(
      "8a000000-0000-4000-8000-000000000002",
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("explains the size limit before starting an oversized upload", async () => {
    const user = userEvent.setup();
    const oversizedFile = new File(["image"], "large-perfume.png", {
      type: "image/png",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: mediaMaxBytes + 2.4 * 1024 * 1024,
    });

    render(<MediaManager assets={[]} issues={[]} />);

    await user.upload(screen.getByLabelText("Image file"), oversizedFile);
    const uploadForm = screen
      .getByRole("button", { name: "Upload image" })
      .closest("form");
    expect(uploadForm).not.toBeNull();
    fireEvent.submit(uploadForm!);

    expect(
      screen.getByText(
        "This image is 12.4 MB. The maximum allowed size is 10 MB. Choose a smaller image and try again.",
      ),
    ).toBeInTheDocument();
    expect(mocks.beginMediaUploadAction).not.toHaveBeenCalled();
    expect(mocks.uploadMediaObject).not.toHaveBeenCalled();
  });
});

function mediaAsset(overrides: Partial<MediaAssetDTO> = {}): MediaAssetDTO {
  return {
    id: "8a000000-0000-4000-8000-000000000001",
    objectPath: "originals/8a000000-0000-4000-8000-000000000001.png",
    status: "ready",
    mimeType: "image/png",
    width: 1200,
    height: 1200,
    byteSize: 2048,
    checksumSha256: "a".repeat(64),
    altText: "A perfume bottle on a neutral background",
    sourceAttribution: null,
    failureCode: null,
    referenceCount: 0,
    publicUrl:
      "http://127.0.0.1:54321/storage/v1/object/public/media/originals/8a000000-0000-4000-8000-000000000001.png",
    createdAt: "2026-08-21T00:00:00Z",
    updatedAt: "2026-08-21T00:00:00Z",
    ...overrides,
  };
}
