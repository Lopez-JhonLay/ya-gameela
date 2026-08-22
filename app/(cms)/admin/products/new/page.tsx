import Link from "next/link";
import { Suspense } from "react";

import { ProductForm } from "@/modules/catalog";
import { getProductEditorData } from "@/modules/catalog/server";

export default function NewProductPage() {
  return (
    <Suspense fallback={<p role="status">Loading product editor…</p>}>
      <NewProductEditor />
    </Suspense>
  );
}

async function NewProductEditor() {
  const editorData = await getProductEditorData();
  return (
    <section aria-labelledby="new-product-heading" className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Back to products
        </Link>
        <h1 id="new-product-heading" className="mt-3 text-3xl font-semibold">
          New product draft
        </h1>
        <p className="mt-2 text-neutral-700">
          Complete the category, images, and at least one valid variant before
          saving.
        </p>
      </div>
      <ProductForm mode="create" editorData={editorData} />
    </section>
  );
}
