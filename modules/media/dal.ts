import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/modules/auth/server";

import {
  mediaBucketName,
  type InspectedMediaDTO,
  type MediaAssetDTO,
  type MediaAssetStatus,
  type MediaHealthIssueDTO,
  type MediaLibraryDTO,
  type MediaMimeType,
  type MediaMutationDTO,
  type MediaUploadCommand,
  type MediaUploadTicketDTO,
} from "./dto";

export class MediaRepositoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "MediaRepositoryError";
  }
}

export async function listMediaLibraryRecords(): Promise<MediaLibraryDTO> {
  const client = await authorizedMediaClient();
  const [assetsResult, referencesResult, healthResult] = await Promise.all([
    client
      .from("media_assets")
      .select(
        "id, object_path, status, mime_type, width, height, byte_size, checksum_sha256, alt_text, source_attribution, failure_code, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    client.from("media_asset_references").select("media_asset_id"),
    client
      .from("media_asset_health")
      .select("media_asset_id, object_path, issue_code, detected_from"),
  ]);

  if (assetsResult.error || referencesResult.error || healthResult.error) {
    throw new MediaRepositoryError("media_read_failed");
  }

  const referenceCounts = new Map<string, number>();
  for (const reference of referencesResult.data) {
    referenceCounts.set(
      reference.media_asset_id,
      (referenceCounts.get(reference.media_asset_id) ?? 0) + 1,
    );
  }

  const assets = assetsResult.data.map((asset) => {
    const publicUrl =
      asset.status === "ready" || asset.status === "deleting"
        ? client.storage.from(mediaBucketName).getPublicUrl(asset.object_path)
            .data.publicUrl
        : null;

    return {
      id: asset.id,
      objectPath: asset.object_path,
      status: asset.status,
      mimeType: asset.mime_type as MediaMimeType | null,
      width: asset.width,
      height: asset.height,
      byteSize: asset.byte_size,
      checksumSha256: asset.checksum_sha256,
      altText: asset.alt_text,
      sourceAttribution: asset.source_attribution,
      failureCode: asset.failure_code,
      referenceCount: referenceCounts.get(asset.id) ?? 0,
      publicUrl,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
    } satisfies MediaAssetDTO;
  });

  const issues = healthResult.data
    .filter(
      (
        issue,
      ): issue is typeof issue & {
        issue_code: string;
        object_path: string;
        detected_from: string;
      } =>
        issue.issue_code !== null &&
        issue.object_path !== null &&
        issue.detected_from !== null,
    )
    .map(
      (issue) =>
        ({
          mediaAssetId: issue.media_asset_id,
          objectPath: issue.object_path,
          issueCode: issue.issue_code,
          detectedFrom: issue.detected_from,
        }) satisfies MediaHealthIssueDTO,
    );

  return { assets, issues };
}

export async function beginMediaUploadRecord(
  command: MediaUploadCommand,
  correlationId: string,
): Promise<MediaUploadTicketDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("begin_media_upload", {
    input_alt_text: command.altText,
    input_byte_size: command.byteSize,
    input_declared_mime_type: command.declaredMimeType,
    input_extension: command.extension,
    input_source_attribution: command.sourceAttribution,
    request_correlation_id: correlationId,
  } as BeginMediaUploadArgs);

  if (error || !data?.media_id || !data.object_path) {
    throw new MediaRepositoryError(normalizeMediaError(error?.message));
  }

  return {
    mediaId: data.media_id,
    objectPath: data.object_path,
    bucketName: mediaBucketName,
  };
}

export async function getMediaInspectionRecord(mediaId: string): Promise<{
  id: string;
  objectPath: string;
  originalExtension: string;
  status: MediaAssetStatus;
}> {
  const client = await authorizedMediaClient();
  const { data, error } = await client
    .from("media_assets")
    .select("id, object_path, original_extension, status")
    .eq("id", mediaId)
    .maybeSingle();

  if (error) {
    throw new MediaRepositoryError("media_read_failed");
  }

  if (!data) {
    throw new MediaRepositoryError("media_not_found");
  }

  return {
    id: data.id,
    objectPath: data.object_path,
    originalExtension: data.original_extension,
    status: data.status,
  };
}

export async function finalizeMediaUploadRecord(
  mediaId: string,
  inspection: InspectedMediaDTO,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("finalize_media_upload", {
    input_byte_size: inspection.byteSize,
    input_checksum_sha256: inspection.checksumSha256,
    input_height: inspection.height,
    input_media_id: mediaId,
    input_mime_type: inspection.mimeType,
    input_width: inspection.width,
    request_correlation_id: correlationId,
  });

  return mutationResult(data, error?.message);
}

export async function rejectMediaUploadRecord(
  mediaId: string,
  failureCode: string,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("reject_media_upload", {
    input_failure_code: failureCode,
    input_media_id: mediaId,
    request_correlation_id: correlationId,
  });

  return mutationResult(data, error?.message);
}

export async function updateMediaMetadataRecord(
  mediaId: string,
  altText: string,
  sourceAttribution: string | null,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("update_media_metadata", {
    input_alt_text: altText,
    input_media_id: mediaId,
    input_source_attribution: sourceAttribution,
    request_correlation_id: correlationId,
  } as UpdateMediaMetadataArgs);

  return mutationResult(data, error?.message);
}

export async function requestMediaDeletionRecord(
  mediaId: string,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("request_media_deletion", {
    input_media_id: mediaId,
    request_correlation_id: correlationId,
  });

  return mutationResult(data, error?.message);
}

export async function completeMediaDeletionRecord(
  mediaId: string,
  correlationId: string,
): Promise<MediaMutationDTO> {
  const client = await authorizedMediaClient();
  const { data, error } = await client.rpc("complete_media_deletion", {
    input_media_id: mediaId,
    request_correlation_id: correlationId,
  });

  return mutationResult(data, error?.message);
}

type MutationResult =
  Database["public"]["CompositeTypes"]["media_mutation_result"] | null;
type BeginMediaUploadArgs =
  Database["public"]["Functions"]["begin_media_upload"]["Args"];
type UpdateMediaMetadataArgs =
  Database["public"]["Functions"]["update_media_metadata"]["Args"];

async function authorizedMediaClient(): Promise<SupabaseClient<Database>> {
  if (!(await getAdminPrincipal())) {
    throw new MediaRepositoryError("media_not_authorized");
  }

  return createServerSupabaseClient();
}

function mutationResult(
  result: MutationResult,
  errorMessage?: string,
): MediaMutationDTO {
  if (errorMessage) {
    throw new MediaRepositoryError(normalizeMediaError(errorMessage));
  }

  if (!result?.media_id || !result.status) {
    throw new MediaRepositoryError("media_mutation_failed");
  }

  return {
    mediaId: result.media_id,
    status: result.status,
  };
}

function normalizeMediaError(message?: string): string {
  if (!message) {
    return "media_mutation_failed";
  }

  const controlledCodes = [
    "media_alt_text_invalid",
    "media_correlation_required",
    "media_deletion_not_requested",
    "media_failure_code_invalid",
    "media_metadata_invalid",
    "media_mutation_failed",
    "media_not_authorized",
    "media_not_found",
    "media_not_pending",
    "media_not_ready",
    "media_object_missing",
    "media_read_failed",
    "media_size_invalid",
    "media_source_invalid",
    "media_still_referenced",
    "media_type_invalid",
  ];

  return (
    controlledCodes.find((code) => message.includes(code)) ??
    "media_mutation_failed"
  );
}
