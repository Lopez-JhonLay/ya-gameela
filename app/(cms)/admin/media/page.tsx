import { Suspense } from "react";

import { MediaManager } from "@/modules/media";
import { getMediaLibrary } from "@/modules/media/server";

export default function MediaPage() {
  return (
    <Suspense fallback={<MediaLoading />}>
      <MediaLibrary />
    </Suspense>
  );
}

async function MediaLibrary() {
  const library = await getMediaLibrary();

  return (
    <section aria-labelledby="media-heading" className="space-y-6">
      <div>
        <p className="text-sm text-neutral-600">Content assets</p>
        <h1 id="media-heading" className="text-3xl font-semibold">
          Media
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-700">
          Upload approved images, maintain useful alternative text, and review
          incomplete media before it is used across the website.
        </p>
      </div>

      <MediaManager assets={library.assets} issues={library.issues} />
    </section>
  );
}

function MediaLoading() {
  return (
    <p className="text-sm text-neutral-600" role="status">
      Loading media library…
    </p>
  );
}
