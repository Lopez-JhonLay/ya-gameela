import Link from "next/link";
import { Suspense } from "react";

import { getCategoryDrafts } from "@/modules/catalog/server";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesLoading />}>
      <CategoryList />
    </Suspense>
  );
}

async function CategoryList() {
  const categories = await getCategoryDrafts();

  return (
    <section aria-labelledby="categories-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-600">Catalog structure</p>
          <h1 id="categories-heading" className="text-3xl font-semibold">
            Categories
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-700">
            Manage top-level categories, subcategories, and product
            specification fields. Changes remain drafts until publishing is
            added in Task 12.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          New category
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-neutral-600">
          No category drafts exist yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <caption className="sr-only">
              Category drafts and their current status
            </caption>
            <thead className="border-b bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Category
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Parent
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Fields
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Status
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category) => (
                <tr key={category.id}>
                  <th className="px-4 py-4 font-medium" scope="row">
                    <span className="block">{category.name}</span>
                    <span className="font-normal text-neutral-500">
                      /{category.slug}
                    </span>
                  </th>
                  <td className="px-4 py-4">
                    {category.parentName ?? "Top level"}
                  </td>
                  <td className="px-4 py-4">{category.fields.length}</td>
                  <td className="px-4 py-4">
                    {category.archived ? "Archived" : "Draft"}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {category.archived ? "Review" : "Edit"}
                      <span className="sr-only"> {category.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CategoriesLoading() {
  return (
    <p className="text-sm text-neutral-600" role="status">
      Loading category drafts…
    </p>
  );
}
