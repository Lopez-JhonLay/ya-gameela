"use client";

import { Upload } from "tus-js-client";

import { publicEnv } from "@/lib/env/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

import { mediaBucketName } from "./dto";

const tusChunkSize = 6 * 1024 * 1024;

export async function uploadMediaObject(
  file: File,
  objectPath: string,
  onProgress: (percentage: number) => void,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    throw new Error("media_session_missing");
  }

  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: buildResumableEndpoint(publicEnv.NEXT_PUBLIC_SUPABASE_URL),
      chunkSize: tusChunkSize,
      retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: mediaBucketName,
        objectName: objectPath,
        contentType: file.type,
        cacheControl: "3600",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onProgress: (bytesSent, bytesTotal) => {
        onProgress(
          bytesTotal === 0 ? 0 : Math.round((bytesSent / bytesTotal) * 100),
        );
      },
      onError: () => reject(new Error("media_storage_upload_failed")),
      onSuccess: () => resolve(),
    });

    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        const matchingUpload = previousUploads.find(
          (previous) => previous.metadata.objectName === objectPath,
        );

        if (matchingUpload) {
          upload.resumeFromPreviousUpload(matchingUpload);
        }

        upload.start();
      })
      .catch(() => upload.start());
  });
}

export function buildResumableEndpoint(supabaseUrl: string): string {
  const endpoint = new URL(supabaseUrl);

  if (endpoint.hostname.endsWith(".supabase.co")) {
    endpoint.hostname = endpoint.hostname.replace(
      /\.supabase\.co$/,
      ".storage.supabase.co",
    );
  }

  endpoint.pathname = "/storage/v1/upload/resumable";
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString().replace(/\/$/, "");
}
