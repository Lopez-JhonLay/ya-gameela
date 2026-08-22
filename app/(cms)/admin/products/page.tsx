import Link from "next/link";
import { Suspense } from "react";

import { priceMinorToMajor } from "@/modules/catalog";
import { getProductDrafts } from "@/modules/catalog/server";

export default function ProductsPage() {
  return (
    <Suspense fallback={<p role="status">Loading product drafts…</p>}>
      <ProductList />
    </Suspense>
  );
}

async function ProductList() {
  const products = await getProductDrafts();

  return (
    <section aria-labelledby="products-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-600">Catalog content</p>
          <h1 id="products-heading" className="text-3xl font-semibold">
            Products
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-700">
            Manage product copy, category specifications, variants, prices,
            availability, and media. Changes remain drafts until publishing is
            added in Task 12.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-neutral-600">
          No product drafts exist yet. Upload at least one verified image before
          creating the first product.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-5xl border-collapse text-left text-sm">
            <caption className="sr-only">
              Product drafts and catalog status
            </caption>
            <thead className="border-b bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Product
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Category
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Variants
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Price range
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Flags
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
              {products.map((product) => {
                const prices = product.variants.map((variant) =>
                  BigInt(variant.price.amountMinor),
                );
                const minimum = prices.reduce((left, right) =>
                  left < right ? left : right,
                );
                const maximum = prices.reduce((left, right) =>
                  left > right ? left : right,
                );
                return (
                  <tr key={product.id}>
                    <th className="px-4 py-4 font-medium" scope="row">
                      <span className="block">{product.name}</span>
                      <span className="font-normal text-neutral-500">
                        /{product.slug}
                      </span>
                    </th>
                    <td className="px-4 py-4">{product.categoryPath}</td>
                    <td className="px-4 py-4">{product.variants.length}</td>
                    <td className="px-4 py-4">
                      {product.baseCurrency}{" "}
                      {priceMinorToMajor(minimum.toString())}
                      {minimum !== maximum
                        ? `–${priceMinorToMajor(maximum.toString())}`
                        : ""}
                    </td>
                    <td className="px-4 py-4">
                      {[
                        product.featured ? "Featured" : null,
                        product.isNew ? "New" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-4">
                      {product.archived ? "Archived" : "Draft"}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {product.archived ? "Review" : "Edit"}
                        <span className="sr-only"> {product.name}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
