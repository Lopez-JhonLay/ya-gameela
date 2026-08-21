export const mediaBucketName = "media";
export const mediaMaxBytes = 10 * 1024 * 1024;
export const mediaMaxDimension = 12_000;
export const mediaMaxPixels = 64_000_000;

export const mediaFormats = ["jpg", "png", "webp", "avif"] as const;
export type MediaFormat = (typeof mediaFormats)[number];

export const mediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type MediaMimeType = (typeof mediaMimeTypes)[number];

export type MediaAssetStatus = "pending" | "ready" | "rejected" | "deleting";

export interface MediaUploadCommand {
  extension: string;
  declaredMimeType: string;
  byteSize: number;
  altText: string;
  sourceAttribution: string | null;
}

export interface MediaUploadTicketDTO {
  mediaId: string;
  objectPath: string;
  bucketName: typeof mediaBucketName;
}

export interface MediaMutationDTO {
  mediaId: string;
  status: MediaAssetStatus;
}

export interface MediaAssetDTO {
  id: string;
  objectPath: string;
  status: MediaAssetStatus;
  mimeType: MediaMimeType | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  checksumSha256: string | null;
  altText: string;
  sourceAttribution: string | null;
  failureCode: string | null;
  referenceCount: number;
  publicUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaHealthIssueDTO {
  mediaAssetId: string | null;
  objectPath: string;
  issueCode: string;
  detectedFrom: string;
}

export interface MediaLibraryDTO {
  assets: MediaAssetDTO[];
  issues: MediaHealthIssueDTO[];
}

export interface InspectedMediaDTO {
  mimeType: MediaMimeType;
  width: number;
  height: number;
  byteSize: number;
  checksumSha256: string;
}
