import { z } from "zod";

import {
  mediaFormats,
  mediaMaxBytes,
  type MediaFormat,
  type MediaMimeType,
} from "./dto";

const mimeByFormat = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const satisfies Record<MediaFormat, MediaMimeType>;

const nullableTrimmedText = (maximum: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, z.string().max(maximum).nullable());

export const mediaUploadCommandSchema = z
  .object({
    extension: z
      .string()
      .trim()
      .toLowerCase()
      .transform((extension) => (extension === "jpeg" ? "jpg" : extension))
      .pipe(z.enum(mediaFormats)),
    declaredMimeType: z.string().trim().toLowerCase(),
    byteSize: z.number().int().min(1).max(mediaMaxBytes),
    altText: z.string().trim().min(1).max(300),
    sourceAttribution: nullableTrimmedText(500),
  })
  .superRefine((command, context) => {
    if (mimeByFormat[command.extension] !== command.declaredMimeType) {
      context.addIssue({
        code: "custom",
        path: ["declaredMimeType"],
        message: "The file extension and content type do not match.",
      });
    }
  });

export const mediaMetadataCommandSchema = z.object({
  mediaId: z.uuid(),
  altText: z.string().trim().min(1).max(300),
  sourceAttribution: nullableTrimmedText(500),
});

export const mediaIdSchema = z.uuid();

export function mediaExtensionFromFilename(filename: string): string | null {
  const finalDot = filename.lastIndexOf(".");

  if (finalDot < 1 || finalDot === filename.length - 1) {
    return null;
  }

  const extension = filename
    .slice(finalDot + 1)
    .trim()
    .toLowerCase();
  return extension === "jpeg" ? "jpg" : extension;
}

export function expectedMimeType(format: MediaFormat): MediaMimeType {
  return mimeByFormat[format];
}
