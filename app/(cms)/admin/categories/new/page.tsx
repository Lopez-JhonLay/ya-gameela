import Link from "next/link";
import { Suspense } from "react";

import { CategoryForm } from "@/modules/catalog";
import { getCategoryDrafts } from "@/modules/catalog/server";

export default function NewCategoryPage() {
  return (
    <Suspense fallback={<p role="status">Loading category form…</p>}>
      <NewCategoryEditor />
    </Suspense>
  );
}

async function NewCategoryEditor() {
  const categories = await getCategoryDrafts();
  const parentOptions = categories.filter(
    (category) => !category.archived && category.parentCategoryId === null,
  );

  return (
    <section aria-labelledby="new-category-heading" className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Back to categories
        </Link>
        <h1 id="new-category-heading" className="mt-3 text-3xl font-semibold">
          New category draft
        </h1>
      </div>
      <CategoryForm mode="create" parentOptions={parentOptions} />
    </section>
  );
}
