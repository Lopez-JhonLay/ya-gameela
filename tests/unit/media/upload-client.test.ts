import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  uploadStart: vi.fn(),
  uploadOptions: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/lib/env/client", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  },
}));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getSession: mocks.getSession },
  }),
}));
vi.mock("tus-js-client", () => ({
  Upload: class Upload {
    constructor(_file: File, options: Record<string, unknown>) {
      mocks.uploadOptions = options;
    }

    findPreviousUploads() {
      return Promise.resolve([]);
    }

    start() {
      mocks.uploadStart();
      const options = mocks.uploadOptions as {
        onProgress: (sent: number, total: number) => void;
        onSuccess: () => void;
      };
      options.onProgress(5, 10);
      options.onSuccess();
    }

    resumeFromPreviousUpload() {}
  },
}));

import {
  buildResumableEndpoint,
  uploadMediaObject,
} from "@/modules/media/upload-client";

describe("resumable media upload client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadOptions = undefined;
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    });
  });

  it("uses the direct hosted Storage endpoint and the local API endpoint", () => {
    expect(buildResumableEndpoint("https://project-ref.supabase.co")).toBe(
      "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
    );
    expect(buildResumableEndpoint("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321/storage/v1/upload/resumable",
    );
  });

  it("uploads to the prepared path with the admin token and progress", async () => {
    const onProgress = vi.fn();
    const file = new File(["image"], "product.png", { type: "image/png" });

    await uploadMediaObject(
      file,
      "originals/8a000000-0000-4000-8000-000000000001.png",
      onProgress,
    );

    expect(mocks.uploadStart).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(mocks.uploadOptions).toMatchObject({
      endpoint:
        "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
      headers: {
        authorization: "Bearer admin-token",
        apikey: "publishable-key",
        "x-upsert": "false",
      },
      metadata: {
        bucketName: "media",
        objectName: "originals/8a000000-0000-4000-8000-000000000001.png",
        contentType: "image/png",
      },
    });
  });
});
