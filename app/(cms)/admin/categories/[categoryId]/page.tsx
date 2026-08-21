import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CategoryForm, CategoryStatusForm } from "@/modules/catalog";
import { getCategoryDrafts } from "@/modules/catalog/server";

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Loading category draft…</p>}>
      <CategoryEditor params={params} />
    </Suspense>
  );
}

async function CategoryEditor({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const parsedId = z.uuid().safeParse((await params).categoryId);

  if (!parsedId.success) {
    notFound();
  }

  const categories = await getCategoryDrafts();
  const category = categories.find((item) => item.id === parsedId.data);

  if (!category) {
    notFound();
  }

  const parentOptions = categories.filter(
    (item) =>
      item.id !== category.id &&
      !item.archived &&
      item.parentCategoryId === null,
  );

  return (
    <section aria-labelledby="edit-category-heading" className="space-y-8">
      <div>
        <Link
          href="/admin/categories"
          className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Back to categories
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 id="edit-category-heading" className="text-3xl font-semibold">
            {category.name}
          </h1>
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium">
            {category.archived
              ? "Archived"
              : `Draft revision ${category.revision}`}
          </span>
        </div>
        {category.archived ? (
          <p className="mt-2 text-sm text-amber-800">
            Restore this category before editing its draft.
          </p>
        ) : null}
      </div>

      <CategoryForm
        mode="update"
        category={category}
        parentOptions={parentOptions}
      />
      <CategoryStatusForm category={category} />
    </section>
  );
}
