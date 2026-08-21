import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";

import { createSystemSupabaseClient } from "@/lib/supabase/system";

import {
  mediaBucketName,
  mediaMaxBytes,
  mediaMaxDimension,
  mediaMaxPixels,
  type InspectedMediaDTO,
  type MediaFormat,
  type MediaLibraryDTO,
  type MediaMutationDTO,
  type MediaUploadCommand,
  type MediaUploadTicketDTO,
} from "./dto";
import {
  beginMediaUploadRecord,
  completeMediaDeletionRecord,
  finalizeMediaUploadRecord,
  getMediaInspectionRecord,
  listMediaLibraryRecords,
  rejectMediaUploadRecord,
  requestMediaDeletionRecord,
  updateMediaMetadataRecord,
} from "./dal";
import { expectedMimeType } from "./schema";

export class MediaServiceError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "MediaServiceError";
  }
}

export async function getMediaLibrary(): Promise<MediaLibraryDTO> {
  return listMediaLibraryRecords();
}

export async function beginMediaUpload(
  command: MediaUploadCommand,
  correlationId: string,
): Promise<MediaUploadTicketDTO> {
  return beginMediaUploadRecord(command, correlationId);
}

export async function verifyMediaUpload(
  mediaId: string,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const asset = await getMediaInspectionRecord(mediaId);

  if (asset.status !== "pending") {
    throw new MediaServiceError("media_not_pending");
  }

  const storage = createSystemSupabaseClient().storage.from(mediaBucketName);
  const { data, error } = await storage.download(asset.objectPath);

  if (error || !data) {
    throw new MediaServiceError("media_object_missing");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await data.arrayBuffer());
  } catch {
    throw new MediaServiceError("media_storage_read_failed");
  }

  let inspection: InspectedMediaDTO;
  try {
    inspection = await inspectImageBytes(bytes, asset.originalExtension);
  } catch (error) {
    const code =
      error instanceof MediaServiceError
        ? error.code
        : "media_inspection_failed";

    await rejectMediaUploadRecord(mediaId, code, correlationId);
    await storage.remove([asset.objectPath]);
    throw new MediaServiceError(code);
  }

  return finalizeMediaUploadRecord(mediaId, inspection, correlationId);
}

export async function updateMediaMetadata(
  mediaId: string,
  altText: string,
  sourceAttribution: string | null,
  correlationId: string,
): Promise<MediaMutationDTO> {
  return updateMediaMetadataRecord(
    mediaId,
    altText,
    sourceAttribution,
    correlationId,
  );
}

export async function deleteMedia(
  mediaId: string,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const asset = await getMediaInspectionRecord(mediaId);

  if (asset.status !== "deleting") {
    await requestMediaDeletionRecord(mediaId, correlationId);
  }

  const { error } = await createSystemSupabaseClient()
    .storage.from(mediaBucketName)
    .remove([asset.objectPath]);

  if (error && !isMissingObjectError(error)) {
    throw new MediaServiceError("media_storage_delete_failed");
  }

  return completeMediaDeletionRecord(mediaId, correlationId);
}

export async function inspectImageBytes(
  bytes: Buffer,
  expectedExtension: string,
): Promise<InspectedMediaDTO> {
  if (bytes.length < 1 || bytes.length > mediaMaxBytes) {
    throw new MediaServiceError("media_size_invalid");
  }

  const metadata = await readImageMetadata(bytes);

  const format = normalizeSharpFormat(metadata.format, metadata.compression);
  if (!format || format !== expectedExtension) {
    throw new MediaServiceError("media_signature_invalid");
  }

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > mediaMaxDimension ||
    metadata.height > mediaMaxDimension ||
    metadata.width * metadata.height > mediaMaxPixels
  ) {
    throw new MediaServiceError("media_dimensions_invalid");
  }

  if ((metadata.pages ?? 1) !== 1) {
    throw new MediaServiceError("media_animation_not_supported");
  }

  return {
    mimeType: expectedMimeType(format),
    width: metadata.width,
    height: metadata.height,
    byteSize: bytes.length,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function readImageMetadata(bytes: Buffer) {
  try {
    return await sharp(bytes, {
      failOn: "error",
      limitInputPixels: mediaMaxPixels,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw new MediaServiceError("media_signature_invalid");
  }
}

function normalizeSharpFormat(
  format?: string,
  compression?: string,
): MediaFormat | null {
  if (format === "jpeg") {
    return "jpg";
  }

  if (format === "png" || format === "webp" || format === "avif") {
    return format;
  }

  if (format === "heif" && compression === "av1") {
    return "avif";
  }

  return null;
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return false;
  }

  return Number(error.statusCode) === 404;
}
