"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { createCorrelationId } from "@/lib/logging/correlation-id";
import { writeLog } from "@/lib/logging/server";
import { getAdminPrincipal } from "@/modules/auth/server";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
  type FieldErrors,
} from "@/modules/platform";

import type {
  MediaMutationDTO,
  MediaUploadCommand,
  MediaUploadTicketDTO,
} from "./dto";
import { MediaRepositoryError } from "./dal";
import {
  mediaIdSchema,
  mediaMetadataCommandSchema,
  mediaUploadCommandSchema,
} from "./schema";
import {
  beginMediaUpload,
  deleteMedia,
  MediaServiceError,
  updateMediaMetadata,
  verifyMediaUpload,
} from "./service";

export type MediaUploadActionResult = ActionResult<MediaUploadTicketDTO>;
export type MediaMutationActionResult = ActionResult<MediaMutationDTO>;

export async function beginMediaUploadAction(
  command: MediaUploadCommand,
): Promise<MediaUploadActionResult> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const parsed = mediaUploadCommandSchema.safeParse(command);
  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  return runMediaMutation("upload_begin", correlationId, () =>
    beginMediaUpload(parsed.data, correlationId),
  );
}

export async function finalizeMediaUploadAction(
  mediaId: string,
): Promise<MediaMutationActionResult> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const parsed = mediaIdSchema.safeParse(mediaId);
  if (!parsed.success) {
    return actionFailure("validation_failed", {
      mediaId: ["Invalid media ID."],
    });
  }

  const correlationId = createCorrelationId();
  const result = await runMediaMutation("upload_finalize", correlationId, () =>
    verifyMediaUpload(parsed.data, correlationId),
  );

  if (result.ok) {
    revalidatePath("/admin/media");
  }

  return result;
}

export async function updateMediaMetadataAction(
  _previousState: MediaMutationActionResult,
  formData: FormData,
): Promise<MediaMutationActionResult> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const parsed = mediaMetadataCommandSchema.safeParse({
    mediaId: formData.get("mediaId"),
    altText: formData.get("altText"),
    sourceAttribution: formData.get("sourceAttribution"),
  });

  if (!parsed.success) {
    return actionFailure("validation_failed", fieldErrors(parsed.error));
  }

  const correlationId = createCorrelationId();
  const result = await runMediaMutation("metadata_update", correlationId, () =>
    updateMediaMetadata(
      parsed.data.mediaId,
      parsed.data.altText,
      parsed.data.sourceAttribution,
      correlationId,
    ),
  );

  if (result.ok) {
    revalidatePath("/admin/media");
  }

  return result;
}

export async function deleteMediaAction(
  _previousState: MediaMutationActionResult,
  formData: FormData,
): Promise<MediaMutationActionResult> {
  if (!(await getAdminPrincipal())) {
    return actionFailure("not_authorized");
  }

  const parsed = mediaIdSchema.safeParse(formData.get("mediaId"));
  if (!parsed.success) {
    return actionFailure("validation_failed", {
      mediaId: ["Invalid media ID."],
    });
  }

  const correlationId = createCorrelationId();
  const result = await runMediaMutation("delete", correlationId, () =>
    deleteMedia(parsed.data, correlationId),
  );

  if (result.ok) {
    revalidatePath("/admin/media");
  }

  return result;
}

async function runMediaMutation<T>(
  operation: string,
  correlationId: string,
  mutation: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return actionSuccess(await mutation());
  } catch (error) {
    const code =
      error instanceof MediaRepositoryError ||
      error instanceof MediaServiceError
        ? error.code
        : "media_mutation_failed";

    writeLog({
      severity: "error",
      event: "media.mutation_failed",
      correlationId,
      context: { outcome: operation, errorCode: code },
    });

    return actionFailure(code);
  }
}

function fieldErrors(error: ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    errors[field] = [...(errors[field] ?? []), issue.message];
    return errors;
  }, {});
}
