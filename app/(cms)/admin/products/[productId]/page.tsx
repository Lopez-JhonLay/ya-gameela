import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { ProductForm, ProductStatusForm } from "@/modules/catalog";
import {
  getProductDraft,
  getProductEditorData,
} from "@/modules/catalog/server";

export default function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Loading product draft…</p>}>
      <ProductEditor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductEditor({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const parsedId = z.uuid().safeParse((await params).productId);
  if (!parsedId.success) notFound();
  const saved = (await searchParams).saved === "1";

  const [product, editorData] = await Promise.all([
    getProductDraft(parsedId.data),
    getProductEditorData(parsedId.data),
  ]);
  if (!product) notFound();

  return (
    <section aria-labelledby="edit-product-heading" className="space-y-8">
      <div>
        <Link
          href="/admin/products"
          className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Back to products
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 id="edit-product-heading" className="text-3xl font-semibold">
            {product.name}
          </h1>
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium">
            {product.archived
              ? "Archived"
              : `Draft revision ${product.revision}`}
          </span>
        </div>
        {product.archived ? (
          <p className="mt-2 text-sm text-amber-800">
            Restore this product before editing its draft.
          </p>
        ) : null}
      </div>

      {saved ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          Product draft saved.
        </p>
      ) : null}

      <ProductForm
        key={product.revision}
        mode="update"
        product={product}
        editorData={editorData}
      />
      <ProductStatusForm product={product} />
    </section>
  );
}
