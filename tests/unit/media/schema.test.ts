import { describe, expect, it } from "vitest";

import {
  mediaExtensionFromFilename,
  mediaUploadCommandSchema,
} from "@/modules/media/schema";

describe("media upload validation", () => {
  it.each([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
    ["avif", "image/avif"],
  ])("accepts %s with its exact MIME type", (extension, mimeType) => {
    const result = mediaUploadCommandSchema.safeParse({
      extension,
      declaredMimeType: mimeType,
      byteSize: 1024,
      altText: "A useful image description",
      sourceAttribution: " Owner supplied ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceAttribution).toBe("Owner supplied");
    }
  });

  it("rejects spoofed content types, SVG, oversized files, and blank alt text", () => {
    expect(
      mediaUploadCommandSchema.safeParse({
        extension: "jpg",
        declaredMimeType: "text/html",
        byteSize: 1024,
        altText: "Spoofed image",
        sourceAttribution: null,
      }).success,
    ).toBe(false);
    expect(
      mediaUploadCommandSchema.safeParse({
        extension: "svg",
        declaredMimeType: "image/svg+xml",
        byteSize: 1024,
        altText: "Unsafe vector",
        sourceAttribution: null,
      }).success,
    ).toBe(false);
    expect(
      mediaUploadCommandSchema.safeParse({
        extension: "png",
        declaredMimeType: "image/png",
        byteSize: 10 * 1024 * 1024 + 1,
        altText: "Too large",
        sourceAttribution: null,
      }).success,
    ).toBe(false);
    expect(
      mediaUploadCommandSchema.safeParse({
        extension: "png",
        declaredMimeType: "image/png",
        byteSize: 1024,
        altText: "   ",
        sourceAttribution: null,
      }).success,
    ).toBe(false);
  });

  it("normalizes safe filename extensions without trusting the whole name", () => {
    expect(mediaExtensionFromFilename("campaign.JPEG")).toBe("jpg");
    expect(mediaExtensionFromFilename("product.webp")).toBe("webp");
    expect(mediaExtensionFromFilename("no-extension")).toBeNull();
    expect(mediaExtensionFromFilename(".hidden")).toBeNull();
  });
});
