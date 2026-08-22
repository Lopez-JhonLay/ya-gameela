"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, type FormEvent } from "react";

import {
  beginMediaUploadAction,
  deleteMediaAction,
  finalizeMediaUploadAction,
  type MediaMutationActionResult,
  updateMediaMetadataAction,
} from "./actions";
import {
  mediaMaxBytes,
  type MediaAssetDTO,
  type MediaHealthIssueDTO,
  type MediaUploadCommand,
} from "./dto";
import { mediaExtensionFromFilename, mediaUploadCommandSchema } from "./schema";
import { uploadMediaObject } from "./upload-client";

const initialMutationState: MediaMutationActionResult = {
  ok: false,
  code: "idle",
};

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950/20";

interface MediaManagerProps {
  assets: MediaAssetDTO[];
  issues: MediaHealthIssueDTO[];
}

export function MediaManager({ assets, issues }: MediaManagerProps) {
  return (
    <div className="space-y-8">
      <MediaUploadForm />
      <MediaHealthPanel issues={issues} />
      <MediaAssetGrid assets={assets} />
    </div>
  );
}

function MediaUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("Choose an image to begin.");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("file");
    const fileValue =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (!fileValue || fileValue.size === 0) {
      setStatus("Choose an image file.");
      return;
    }

    if (fileValue.size > mediaMaxBytes) {
      setStatus(
        `This image is ${formatBytes(fileValue.size)}. The maximum allowed size is ${formatBytes(mediaMaxBytes)}. Choose a smaller image and try again.`,
      );
      return;
    }

    const extension = mediaExtensionFromFilename(fileValue.name);
    const candidate: MediaUploadCommand = {
      extension: extension ?? "",
      declaredMimeType: fileValue.type,
      byteSize: fileValue.size,
      altText: String(formData.get("altText") ?? ""),
      sourceAttribution: String(formData.get("sourceAttribution") ?? ""),
    };
    const parsed = mediaUploadCommandSchema.safeParse(candidate);

    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? "Review the upload fields.");
      return;
    }

    setPending(true);
    setProgress(0);
    setStatus("Preparing a protected upload…");

    try {
      const ticket = await beginMediaUploadAction(parsed.data);
      if (!ticket.ok) {
        setStatus(mediaErrorMessage(ticket.code));
        return;
      }

      setStatus("Uploading image…");
      await uploadMediaObject(fileValue, ticket.data.objectPath, setProgress);

      setStatus("Checking image safety and dimensions…");
      const finalized = await finalizeMediaUploadAction(ticket.data.mediaId);
      if (!finalized.ok) {
        setStatus(mediaErrorMessage(finalized.code));
        return;
      }

      setProgress(100);
      setStatus("Image uploaded and verified.");
      formRef.current?.reset();
      router.refresh();
    } catch {
      setStatus("The upload was interrupted. It is listed for safe recovery.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-xl border bg-white p-5"
    >
      <h2 id="upload-heading" className="text-xl font-semibold">
        Upload image
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        JPEG, PNG, WebP, or AVIF. Maximum {formatBytes(mediaMaxBytes)}. Keep a
        backup of the original image in your own cloud drive or external drive.
      </p>

      <form
        ref={formRef}
        className="mt-5 grid gap-5 md:grid-cols-2"
        onSubmit={submitUpload}
      >
        <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
          <span>Image file</span>
          <input
            className={inputClassName}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
            required
            disabled={pending}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          <span>Alternative text</span>
          <textarea
            className={inputClassName}
            name="altText"
            rows={3}
            required
            maxLength={300}
            disabled={pending}
            aria-describedby="upload-alt-hint"
          />
          <span id="upload-alt-hint" className="font-normal text-neutral-600">
            Describe what the image communicates to someone who cannot see it.
          </span>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          <span>Source or attribution (optional)</span>
          <textarea
            className={inputClassName}
            name="sourceAttribution"
            rows={3}
            maxLength={500}
            disabled={pending}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <button
            className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? "Uploading…" : "Upload image"}
          </button>
          <p className="text-sm text-neutral-700" aria-live="polite">
            {status}
          </p>
        </div>

        {pending ? (
          <progress
            className="h-2 w-full md:col-span-2"
            max={100}
            value={progress}
            aria-label="Image upload progress"
          >
            {progress}%
          </progress>
        ) : null}
      </form>
    </section>
  );
}

function MediaHealthPanel({ issues }: { issues: MediaHealthIssueDTO[] }) {
  if (issues.length === 0) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        No missing or orphaned media objects detected.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="media-health-heading"
      className="rounded-xl border border-amber-300 bg-amber-50 p-5"
    >
      <h2 id="media-health-heading" className="font-semibold text-amber-950">
        Media requiring attention
      </h2>
      <ul className="mt-3 grid gap-2 text-sm text-amber-950">
        {issues.map((issue) => (
          <li key={`${issue.objectPath}:${issue.issueCode}`}>
            {healthIssueMessage(issue.issueCode)}{" "}
            <span className="font-mono text-xs break-all">
              {issue.objectPath}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MediaAssetGrid({ assets }: { assets: MediaAssetDTO[] }) {
  if (assets.length === 0) {
    return (
      <p className="rounded-xl border bg-white p-6 text-neutral-600">
        No media has been uploaded yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="library-heading">
      <h2 id="library-heading" className="text-xl font-semibold">
        Media library
      </h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <MediaAssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </section>
  );
}

function MediaAssetCard({ asset }: { asset: MediaAssetDTO }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-white">
      <div className="relative aspect-square bg-neutral-100">
        {asset.publicUrl && asset.width && asset.height ? (
          <Image
            src={asset.publicUrl}
            alt={asset.altText}
            width={asset.width}
            height={asset.height}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-500">
            Preview available after verification
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium capitalize">
            {asset.status}
          </span>
          <span className="text-xs text-neutral-600">
            Used in {asset.referenceCount} saved version
            {asset.referenceCount === 1 ? "" : "s"}
          </span>
        </div>

        {asset.status === "ready" ? (
          <MediaMetadataForm asset={asset} />
        ) : (
          <div className="space-y-2 text-sm">
            <p>{asset.altText}</p>
            {asset.failureCode ? (
              <p className="text-red-700">
                Rejected: {mediaErrorMessage(asset.failureCode)}
              </p>
            ) : null}
          </div>
        )}

        <MediaRecoveryControls asset={asset} />
      </div>
    </article>
  );
}

function MediaMetadataForm({ asset }: { asset: MediaAssetDTO }) {
  const [state, formAction, pending] = useActionState(
    updateMediaMetadataAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="mediaId" value={asset.id} />
      <label className="grid gap-1 text-sm font-medium">
        <span>Alternative text</span>
        <textarea
          className={inputClassName}
          name="altText"
          rows={3}
          required
          maxLength={300}
          defaultValue={asset.altText}
          disabled={pending}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        <span>Source or attribution</span>
        <textarea
          className={inputClassName}
          name="sourceAttribution"
          rows={2}
          maxLength={500}
          defaultValue={asset.sourceAttribution ?? ""}
          disabled={pending}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save metadata"}
        </button>
        <ActionFeedback state={state} success="Metadata saved." />
      </div>
      <p className="text-xs text-neutral-500">
        {asset.width}×{asset.height} · {formatBytes(asset.byteSize ?? 0)}
      </p>
    </form>
  );
}

function MediaRecoveryControls({ asset }: { asset: MediaAssetDTO }) {
  const router = useRouter();
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteMediaAction,
    initialMutationState,
  );

  async function retryVerification() {
    setVerifying(true);
    setVerificationMessage("Checking uploaded object…");
    const result = await finalizeMediaUploadAction(asset.id);
    setVerifying(false);

    if (!result.ok) {
      setVerificationMessage(mediaErrorMessage(result.code));
      return;
    }

    setVerificationMessage("Image verified.");
    router.refresh();
  }

  return (
    <div className="space-y-2 border-t pt-3">
      {asset.status === "pending" ? (
        <button
          className="rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          type="button"
          onClick={retryVerification}
          disabled={verifying}
        >
          {verifying ? "Verifying…" : "Retry verification"}
        </button>
      ) : null}
      {verificationMessage ? (
        <p className="text-sm" aria-live="polite">
          {verificationMessage}
        </p>
      ) : null}

      <form action={deleteAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="mediaId" value={asset.id} />
        <button
          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={deleting || asset.referenceCount > 0}
        >
          {deleting
            ? "Deleting…"
            : asset.status === "deleting"
              ? "Retry deletion"
              : "Delete image"}
        </button>
        {asset.referenceCount > 0 ? (
          <span className="text-xs text-neutral-600">
            This image is part of saved content history and cannot be deleted.
          </span>
        ) : null}
        <ActionFeedback state={deleteState} success="Image deleted." />
      </form>
    </div>
  );
}

function ActionFeedback({
  state,
  success,
}: {
  state: MediaMutationActionResult;
  success: string;
}) {
  if (!state.ok && state.code === "idle") {
    return null;
  }

  return (
    <span
      className={`text-sm ${state.ok ? "text-emerald-800" : "text-red-700"}`}
      aria-live="polite"
    >
      {state.ok ? success : mediaErrorMessage(state.code)}
    </span>
  );
}

function mediaErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    validation_failed: "Review the media fields and try again.",
    not_authorized: "Your administrator session is no longer authorized.",
    media_alt_text_invalid: "Alternative text is required.",
    media_animation_not_supported: "Animated images are not supported.",
    media_dimensions_invalid: "The image dimensions are too large.",
    media_inspection_failed: "The image could not be inspected safely.",
    media_not_found: "This media record no longer exists.",
    media_not_pending: "This upload is no longer waiting for verification.",
    media_object_missing: "The uploaded object could not be found.",
    media_signature_invalid:
      "The file contents do not match an approved image format.",
    media_size_invalid: "The image must be no larger than 10 MB.",
    media_source_invalid: "The source or attribution is too long.",
    media_still_referenced: "This image is still used by site content.",
    media_storage_delete_failed:
      "Storage deletion failed safely. Use Retry deletion.",
    media_storage_read_failed:
      "The uploaded image could not be read. Retry verification.",
    media_storage_upload_failed:
      "The upload was interrupted. Check your connection and try again.",
    media_type_invalid: "Choose a JPEG, PNG, WebP, or AVIF image.",
  };

  return messages[code] ?? "The media operation failed safely. Try again.";
}

function healthIssueMessage(code: string): string {
  const messages: Record<string, string> = {
    ready_object_missing: "Verified metadata has no Storage object:",
    pending_without_object: "An upload was started but no object arrived:",
    upload_not_finalized: "A stored upload still needs verification:",
    rejected_object_present: "A rejected object still needs cleanup:",
    deletion_incomplete: "A requested deletion still has an object:",
    deletion_ready_to_complete: "Storage is clear; metadata cleanup remains:",
    object_without_metadata: "A Storage object has no metadata record:",
  };

  return messages[code] ?? "Media state needs review:";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
