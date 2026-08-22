"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";

import {
  archiveProductAction,
  createProductAction,
  restoreProductAction,
  updateProductAction,
  type ProductActionState,
} from "./product-actions";
import type { CategoryFieldDTO } from "./category-dto";
import {
  productAvailabilityValues,
  type ProductDraftDTO,
  type ProductEditorDataDTO,
  type ProductFormPayloadDTO,
  type ProductOptionGroupDraftDTO,
  type ProductVariantDraftDTO,
} from "./product-dto";
import { productErrorMessage } from "./product-messages";
import { priceMinorToMajor } from "./product-schema";

const initialActionState: ProductActionState = { ok: false, code: "idle" };
const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950/20 disabled:bg-neutral-100";
const buttonClassName =
  "rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface ProductFormProps {
  mode: "create" | "update";
  editorData: ProductEditorDataDTO;
  product?: ProductDraftDTO;
}

export function ProductForm({ mode, editorData, product }: ProductFormProps) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [payload, setPayload] = useState<ProductFormPayloadDTO>(() =>
    initialPayload(product),
  );
  const [tagsText, setTagsText] = useState(product?.tags.join(", ") ?? "");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const selectedCategory = editorData.categories.find(
    (category) => category.id === payload.categoryId,
  );
  const disabled = pending || product?.archived === true;
  const serializedPayload = JSON.stringify({
    ...payload,
    tags: tagsText
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  });

  function update<K extends keyof ProductFormPayloadDTO>(
    key: K,
    value: ProductFormPayloadDTO[K],
  ) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  function selectCategory(categoryId: string) {
    const category = editorData.categories.find(
      (item) => item.id === categoryId,
    );
    const allowedKeys = new Set(
      category?.fields.map((field) => field.key) ?? [],
    );
    setPayload((current) => ({
      ...current,
      categoryId,
      specifications: Object.fromEntries(
        Object.entries(current.specifications).filter(([key]) =>
          allowedKeys.has(key),
        ),
      ),
    }));
  }

  function generateVariants() {
    if (payload.optionGroups.some((group) => group.values.length === 0)) {
      setLocalMessage("Add at least one value to every option group first.");
      return;
    }

    const combinations = optionCombinations(payload.optionGroups);
    if (combinations.length > 100) {
      setLocalMessage(
        `These options create ${combinations.length} combinations. Reduce them to 100 or fewer.`,
      );
      return;
    }

    const existingBySignature = new Map(
      payload.variants.map((variant) => [
        optionSignature(variant.optionValues),
        variant,
      ]),
    );
    update(
      "variants",
      combinations.map((optionValues) => {
        const existing = existingBySignature.get(optionSignature(optionValues));
        return (
          existing ?? {
            id: null,
            sku: null,
            optionValues,
            priceMajor: "",
            availability: "available",
          }
        );
      }),
    );
    setLocalMessage(
      `${combinations.length} variant combination${combinations.length === 1 ? "" : "s"} generated.`,
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {mode === "update" && product ? (
        <>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="revision" value={product.revision} />
        </>
      ) : null}
      <input type="hidden" name="payload" value={serializedPayload} />

      <fieldset disabled={disabled} className="space-y-8 disabled:opacity-75">
        <ProductDetailsSection
          payload={payload}
          tagsText={tagsText}
          categories={editorData.categories}
          onUpdate={update}
          onTagsChange={setTagsText}
          onCategoryChange={selectCategory}
        />

        <SpecificationSection
          fields={selectedCategory?.fields ?? []}
          specifications={payload.specifications}
          onChange={(specifications) =>
            update("specifications", specifications)
          }
        />

        <OptionGroupsSection
          groups={payload.optionGroups}
          onChange={(groups) => update("optionGroups", groups)}
          onGenerate={generateVariants}
        />

        <VariantsSection
          variants={payload.variants}
          groups={payload.optionGroups}
          currency={payload.baseCurrency}
          onChange={(variants) => update("variants", variants)}
        />

        <MediaSection
          media={editorData.media}
          selectedIds={payload.mediaAssetIds}
          seoMediaId={payload.seoSocialMediaAssetId}
          onSelectedChange={(ids) => update("mediaAssetIds", ids)}
          onSeoChange={(id) => update("seoSocialMediaAssetId", id)}
          onMessage={setLocalMessage}
        />

        <RelatedProductsSection
          options={editorData.relationOptions}
          selectedIds={payload.relatedProductIds}
          onChange={(ids) => update("relatedProductIds", ids)}
        />

        <SeoSection payload={payload} onUpdate={update} />

        <div className="rounded-xl border bg-white p-5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          >
            {pending
              ? "Saving product draft…"
              : mode === "create"
                ? "Create product draft"
                : "Save product draft"}
          </button>
          <FormFeedback state={state} localMessage={localMessage} />
        </div>
      </fieldset>
    </form>
  );
}

export function ProductStatusForm({ product }: { product: ProductDraftDTO }) {
  const action = product.archived ? restoreProductAction : archiveProductAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  return (
    <form action={formAction} className="rounded-xl border bg-white p-5">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="revision" value={product.revision} />
      <h2 className="text-lg font-semibold">
        {product.archived ? "Restore product" : "Archive product"}
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        {product.archived
          ? "Restoring makes this draft editable again. It does not publish it."
          : "Archiving removes this product from active CMS choices without deleting its history."}
      </p>
      <button
        type="submit"
        disabled={pending}
        className={`mt-4 ${buttonClassName} ${
          product.archived
            ? "border-emerald-700 text-emerald-800"
            : "border-red-300 text-red-700"
        }`}
      >
        {pending
          ? "Saving…"
          : product.archived
            ? "Restore product"
            : "Archive product"}
      </button>
      <FormFeedback state={state} localMessage={null} />
    </form>
  );
}

function ProductDetailsSection({
  payload,
  tagsText,
  categories,
  onUpdate,
  onTagsChange,
  onCategoryChange,
}: {
  payload: ProductFormPayloadDTO;
  tagsText: string;
  categories: ProductEditorDataDTO["categories"];
  onUpdate: <K extends keyof ProductFormPayloadDTO>(
    key: K,
    value: ProductFormPayloadDTO[K],
  ) => void;
  onTagsChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}) {
  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">Product details</legend>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" error={null}>
          <input
            className={inputClassName}
            value={payload.name}
            onChange={(event) => onUpdate("name", event.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field
          label="Slug"
          hint="Lowercase URL text, for example rose-eau-de-parfum."
        >
          <input
            className={inputClassName}
            value={payload.slug}
            onChange={(event) => onUpdate("slug", event.target.value)}
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClassName}
            value={payload.categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            required
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.path}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Base currency"
          hint="Task 11 will make this a global CMS setting."
        >
          <select
            className={inputClassName}
            value={payload.baseCurrency}
            onChange={(event) =>
              onUpdate(
                "baseCurrency",
                event.target.value as ProductFormPayloadDTO["baseCurrency"],
              )
            }
          >
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="PHP">PHP</option>
          </select>
        </Field>
        <Field label="Short description" className="md:col-span-2">
          <textarea
            className={inputClassName}
            value={payload.shortDescription}
            onChange={(event) =>
              onUpdate("shortDescription", event.target.value)
            }
            required
            rows={3}
            maxLength={300}
          />
        </Field>
        <Field label="Full description" className="md:col-span-2">
          <textarea
            className={inputClassName}
            value={payload.description}
            onChange={(event) => onUpdate("description", event.target.value)}
            required
            rows={8}
            maxLength={5000}
          />
        </Field>
        <Field
          label="Tags"
          hint="Comma-separated lowercase slugs, for example floral, gift-ready."
          className="md:col-span-2"
        >
          <input
            className={inputClassName}
            value={tagsText}
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder="floral, gift-ready"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={payload.featured}
            onChange={(event) => onUpdate("featured", event.target.checked)}
          />
          Featured product
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={payload.isNew}
            onChange={(event) => onUpdate("isNew", event.target.checked)}
          />
          New arrival
        </label>
      </div>
    </fieldset>
  );
}

function SpecificationSection({
  fields,
  specifications,
  onChange,
}: {
  fields: CategoryFieldDTO[];
  specifications: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  function setSpecification(key: string, value: unknown) {
    const next = { ...specifications };
    if (
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  }

  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">
        Category specifications
      </legend>
      {fields.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Choose a category to load its specification fields. Categories without
          fields need no specifications.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <SpecificationField
              key={field.key}
              field={field}
              value={specifications[field.key]}
              onChange={(value) => setSpecification(field.key, value)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

function SpecificationField({
  field,
  value,
  onChange,
}: {
  field: CategoryFieldDTO;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = `${field.label}${field.required ? " (required)" : ""}`;
  if (field.type === "boolean") {
    return (
      <Field label={label}>
        <select
          className={inputClassName}
          value={typeof value === "boolean" ? String(value) : ""}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? undefined
                : event.target.value === "true",
            )
          }
          required={field.required}
        >
          <option value="">Choose</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={label}>
        <select
          className={inputClassName}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={field.required}
        >
          <option value="">Choose</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "multi_select") {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    return (
      <fieldset className="rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">{label}</legend>
        <div className="grid gap-2">
          {field.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (field.type === "number" || field.type === "measurement") {
    return (
      <Field
        label={label}
        hint={field.unit ? `Unit: ${field.unit}` : undefined}
      >
        <input
          className={inputClassName}
          type="number"
          step="any"
          value={typeof value === "number" ? value : ""}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
            )
          }
          required={field.required}
        />
      </Field>
    );
  }
  return (
    <Field label={label}>
      <input
        className={inputClassName}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || undefined)}
        required={field.required}
        maxLength={500}
      />
    </Field>
  );
}

function OptionGroupsSection({
  groups,
  onChange,
  onGenerate,
}: {
  groups: ProductOptionGroupDraftDTO[];
  onChange: (groups: ProductOptionGroupDraftDTO[]) => void;
  onGenerate: () => void;
}) {
  function updateGroup(index: number, group: ProductOptionGroupDraftDTO) {
    onChange(
      groups.map((item, itemIndex) => (itemIndex === index ? group : item)),
    );
  }

  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">Options</legend>
      <p className="text-sm text-neutral-600">
        Add up to three groups such as Volume, Color, or Size. Products without
        options use one default variant.
      </p>
      <div className="mt-5 space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Field label={`Group ${groupIndex + 1} name`}>
                <input
                  className={inputClassName}
                  value={group.name}
                  onChange={(event) =>
                    updateGroup(groupIndex, {
                      ...group,
                      name: event.target.value,
                    })
                  }
                  placeholder="Volume"
                  required
                />
              </Field>
              <Field
                label={`Group ${groupIndex + 1} key`}
                hint="Stable lowercase key, for example volume."
              >
                <input
                  className={inputClassName}
                  value={group.key}
                  onChange={(event) =>
                    updateGroup(groupIndex, {
                      ...group,
                      key: event.target.value.toLowerCase(),
                    })
                  }
                  placeholder="volume"
                  pattern="[a-z][a-z0-9_]*"
                  required
                />
              </Field>
              <button
                type="button"
                className={`${buttonClassName} self-end text-red-700`}
                onClick={() =>
                  onChange(groups.filter((_, index) => index !== groupIndex))
                }
              >
                Remove group
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {group.values.map((optionValue, valueIndex) => (
                <div
                  key={valueIndex}
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <Field label={`Value ${valueIndex + 1} label`}>
                    <input
                      className={inputClassName}
                      value={optionValue.label}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          values: group.values.map((value, index) =>
                            index === valueIndex
                              ? { ...value, label: event.target.value }
                              : value,
                          ),
                        })
                      }
                      placeholder="50 ml"
                      required
                    />
                  </Field>
                  <Field label={`Value ${valueIndex + 1} key`}>
                    <input
                      className={inputClassName}
                      value={optionValue.key}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          values: group.values.map((value, index) =>
                            index === valueIndex
                              ? {
                                  ...value,
                                  key: event.target.value.toLowerCase(),
                                }
                              : value,
                          ),
                        })
                      }
                      placeholder="50ml"
                      pattern="[a-z0-9][a-z0-9_-]*"
                      required
                    />
                  </Field>
                  <button
                    type="button"
                    className={`${buttonClassName} self-end`}
                    disabled={group.values.length === 1}
                    onClick={() =>
                      updateGroup(groupIndex, {
                        ...group,
                        values: group.values.filter(
                          (_, index) => index !== valueIndex,
                        ),
                      })
                    }
                  >
                    Remove value
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={buttonClassName}
                disabled={group.values.length >= 20}
                onClick={() =>
                  updateGroup(groupIndex, {
                    ...group,
                    values: [...group.values, { key: "", label: "" }],
                  })
                }
              >
                Add value
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClassName}
          disabled={groups.length >= 3}
          onClick={() =>
            onChange([
              ...groups,
              {
                key: `option_${groups.length + 1}`,
                name: "",
                values: [{ key: "", label: "" }],
              },
            ])
          }
        >
          Add option group
        </button>
        <button
          type="button"
          className={`${buttonClassName} bg-neutral-950 text-white`}
          onClick={onGenerate}
        >
          Generate variant combinations
        </button>
      </div>
    </fieldset>
  );
}

function VariantsSection({
  variants,
  groups,
  currency,
  onChange,
}: {
  variants: ProductFormPayloadDTO["variants"];
  groups: ProductOptionGroupDraftDTO[];
  currency: string;
  onChange: (variants: ProductFormPayloadDTO["variants"]) => void;
}) {
  function updateVariant(
    index: number,
    changes: Partial<(typeof variants)[number]>,
  ) {
    onChange(
      variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...changes } : variant,
      ),
    );
  }

  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">
        Variants and prices
      </legend>
      <p className="text-sm text-neutral-600">
        Prices are regular prices in {currency}. SKU is optional but must be
        unique when supplied.
      </p>
      <div className="mt-5 space-y-4">
        {variants.map((variant, index) => (
          <div
            key={`${variant.id ?? "new"}-${optionSignature(variant.optionValues)}-${index}`}
            className="rounded-lg border p-4"
          >
            <h3 className="font-semibold">
              {groups.length === 0
                ? "Default variant"
                : groups
                    .map((group) => {
                      const selectedKey = variant.optionValues[group.key];
                      return (
                        group.values.find((value) => value.key === selectedKey)
                          ?.label ??
                        selectedKey ??
                        "Missing value"
                      );
                    })
                    .join(" / ")}
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Field label={`Variant ${index + 1} SKU`}>
                <input
                  className={inputClassName}
                  value={variant.sku ?? ""}
                  onChange={(event) =>
                    updateVariant(index, { sku: event.target.value || null })
                  }
                  maxLength={64}
                />
              </Field>
              <Field label={`Variant ${index + 1} price (${currency})`}>
                <input
                  className={inputClassName}
                  inputMode="decimal"
                  value={variant.priceMajor}
                  onChange={(event) =>
                    updateVariant(index, { priceMajor: event.target.value })
                  }
                  placeholder="125.00"
                  required
                />
              </Field>
              <Field label={`Variant ${index + 1} availability`}>
                <select
                  className={inputClassName}
                  value={variant.availability}
                  onChange={(event) =>
                    updateVariant(index, {
                      availability: event.target
                        .value as ProductVariantDraftDTO["availability"],
                    })
                  }
                >
                  {productAvailabilityValues.map((availability) => (
                    <option key={availability} value={availability}>
                      {availabilityLabel(availability)}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className={`${buttonClassName} self-end text-red-700`}
                disabled={variants.length === 1}
                onClick={() =>
                  onChange(
                    variants.filter(
                      (_, variantIndex) => variantIndex !== index,
                    ),
                  )
                }
              >
                Remove variant
              </button>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function MediaSection({
  media,
  selectedIds,
  seoMediaId,
  onSelectedChange,
  onSeoChange,
  onMessage,
}: {
  media: ProductEditorDataDTO["media"];
  selectedIds: string[];
  seoMediaId: string | null;
  onSelectedChange: (ids: string[]) => void;
  onSeoChange: (id: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const mediaById = useMemo(
    () => new Map(media.map((asset) => [asset.id, asset])),
    [media],
  );

  function toggle(id: string, checked: boolean) {
    if (checked && selectedIds.length >= 12) {
      onMessage("A product gallery can contain up to 12 images.");
      return;
    }
    onSelectedChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((item) => item !== id),
    );
  }

  function move(id: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onSelectedChange(next);
  }

  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">Product images</legend>
      <p className="text-sm text-neutral-600">
        Select 1 to 12 verified images. The first selected image is the primary
        gallery image.
      </p>
      {media.length === 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Upload and verify at least one image in the Media library before
          creating a product.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((asset) => (
            <label key={asset.id} className="rounded-lg border p-3 text-sm">
              <Image
                src={asset.publicUrl}
                alt={asset.altText}
                width={asset.width}
                height={asset.height}
                className="aspect-square w-full rounded-md object-cover"
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              />
              <span className="mt-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(asset.id)}
                  onChange={(event) => toggle(asset.id, event.target.checked)}
                />
                <span>{asset.altText}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      {selectedIds.length > 0 ? (
        <div className="mt-5">
          <h3 className="font-semibold">Gallery order</h3>
          <ol className="mt-2 space-y-2">
            {selectedIds.map((id, index) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span>
                  {index + 1}.{" "}
                  {mediaById.get(id)?.altText ?? "Unavailable image"}
                  {index === 0 ? " (primary)" : ""}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClassName}
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className={buttonClassName}
                    disabled={index === selectedIds.length - 1}
                    onClick={() => move(id, 1)}
                  >
                    Move down
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <Field
        label="SEO social image"
        hint="Optional. If blank, the storefront can fall back to the primary image."
        className="mt-5"
      >
        <select
          className={inputClassName}
          value={seoMediaId ?? ""}
          onChange={(event) => onSeoChange(event.target.value || null)}
        >
          <option value="">Use primary gallery image</option>
          {media.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.altText}
            </option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}

function RelatedProductsSection({
  options,
  selectedIds,
  onChange,
}: {
  options: ProductEditorDataDTO["relationOptions"];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">Related products</legend>
      <p className="text-sm text-neutral-600">
        Choose up to 12 active product drafts. Order follows selection order.
      </p>
      {options.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          No other active products are available yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 rounded-lg border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                disabled={
                  !selectedIds.includes(option.id) && selectedIds.length >= 12
                }
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selectedIds, option.id]
                      : selectedIds.filter((id) => id !== option.id),
                  )
                }
              />
              {option.name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function SeoSection({
  payload,
  onUpdate,
}: {
  payload: ProductFormPayloadDTO;
  onUpdate: <K extends keyof ProductFormPayloadDTO>(
    key: K,
    value: ProductFormPayloadDTO[K],
  ) => void;
}) {
  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">
        Search and social copy
      </legend>
      <div className="grid gap-5">
        <Field label="SEO title" hint="Optional, up to 70 characters.">
          <input
            className={inputClassName}
            value={payload.seoTitle ?? ""}
            onChange={(event) =>
              onUpdate("seoTitle", event.target.value || null)
            }
            maxLength={70}
          />
        </Field>
        <Field label="SEO description" hint="Optional, up to 180 characters.">
          <textarea
            className={inputClassName}
            value={payload.seoDescription ?? ""}
            onChange={(event) =>
              onUpdate("seoDescription", event.target.value || null)
            }
            maxLength={180}
            rows={3}
          />
        </Field>
      </div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${className ?? ""}`}>
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="font-normal text-neutral-600">{hint}</span>
      ) : null}
    </label>
  );
}

function FormFeedback({
  state,
  localMessage,
}: {
  state: ProductActionState;
  localMessage: string | null;
}) {
  const errors = !state.ok ? Object.values(state.fieldErrors ?? {}).flat() : [];
  if (!localMessage && !state.ok && state.code === "idle") return null;
  return (
    <div className="mt-4 text-sm" aria-live="polite">
      {localMessage ? <p className="text-neutral-700">{localMessage}</p> : null}
      {state.ok ? (
        <p className="text-emerald-800">Product draft saved.</p>
      ) : state.code !== "idle" ? (
        <div className="text-red-700">
          <p>{productErrorMessage(state.code)}</p>
          {errors.length > 0 ? (
            <ul className="mt-1 list-disc pl-5">
              {[...new Set(errors)].map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function initialPayload(product?: ProductDraftDTO): ProductFormPayloadDTO {
  if (!product) {
    return {
      name: "",
      slug: "",
      categoryId: "",
      shortDescription: "",
      description: "",
      tags: [],
      specifications: {},
      featured: false,
      isNew: false,
      seoTitle: null,
      seoDescription: null,
      seoSocialMediaAssetId: null,
      baseCurrency: "AED",
      optionGroups: [],
      variants: [
        {
          id: null,
          sku: null,
          optionValues: {},
          priceMajor: "",
          availability: "available",
        },
      ],
      mediaAssetIds: [],
      relatedProductIds: [],
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    shortDescription: product.shortDescription,
    description: product.description,
    tags: product.tags,
    specifications: product.specifications,
    featured: product.featured,
    isNew: product.isNew,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    seoSocialMediaAssetId: product.seoSocialMediaAssetId,
    baseCurrency: product.baseCurrency,
    optionGroups: product.optionGroups,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      optionValues: variant.optionValues,
      priceMajor: priceMinorToMajor(variant.price.amountMinor),
      availability: variant.availability,
    })),
    mediaAssetIds: product.gallery.map((item) => item.mediaAssetId),
    relatedProductIds: product.relatedProductIds,
  };
}

function optionCombinations(
  groups: ProductOptionGroupDraftDTO[],
): Array<Record<string, string>> {
  if (groups.length === 0) return [{}];
  return groups.reduce<Array<Record<string, string>>>(
    (combinations, group) =>
      combinations.flatMap((combination) =>
        group.values.map((value) => ({
          ...combination,
          [group.key]: value.key,
        })),
      ),
    [{}],
  );
}

function optionSignature(optionValues: Record<string, string>) {
  return Object.keys(optionValues)
    .sort()
    .map((key) => `${key}=${optionValues[key]}`)
    .join("|");
}

function availabilityLabel(value: ProductVariantDraftDTO["availability"]) {
  const labels: Record<ProductVariantDraftDTO["availability"], string> = {
    available: "Available",
    low_stock: "Low stock",
    coming_soon: "Coming soon",
    unavailable: "Unavailable",
  };
  return labels[value];
}
