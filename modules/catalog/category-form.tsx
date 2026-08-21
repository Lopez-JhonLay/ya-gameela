"use client";

import { useActionState, useState } from "react";

import {
  archiveCategoryAction,
  createCategoryAction,
  restoreCategoryAction,
  type CategoryActionState,
  updateCategoryAction,
} from "./category-actions";
import {
  categoryFieldTypes,
  type CategoryDraftDTO,
  type CategoryFieldDTO,
  type CategoryFieldOptionDTO,
  type CategoryFieldType,
} from "./category-dto";

const initialActionState: CategoryActionState = {
  ok: false,
  code: "idle",
};

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950/20";

interface CategoryFormProps {
  mode: "create" | "update";
  category?: CategoryDraftDTO;
  parentOptions: CategoryDraftDTO[];
}

export function CategoryForm({
  mode,
  category,
  parentOptions,
}: CategoryFormProps) {
  const action =
    mode === "create" ? createCategoryAction : updateCategoryAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [fields, setFields] = useState<CategoryFieldDTO[]>(
    category?.fields ?? [],
  );

  return (
    <form
      key={category ? `${category.id}:${category.revision}` : "new-category"}
      action={formAction}
      className="space-y-8"
    >
      {category ? (
        <>
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="revision" value={category.revision} />
        </>
      ) : null}
      <input type="hidden" name="fieldSchema" value={JSON.stringify(fields)} />

      <ActionFeedback state={state} />

      <fieldset className="grid gap-5 rounded-xl border bg-white p-5 md:grid-cols-2">
        <legend className="px-2 font-semibold">Category details</legend>
        <FormField label="Name" errors={stateFieldErrors(state, "name")}>
          <input
            className={inputClassName}
            id="category-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            defaultValue={category?.name ?? ""}
          />
        </FormField>

        <FormField label="Slug" errors={stateFieldErrors(state, "slug")}>
          <input
            className={inputClassName}
            id="category-slug"
            name="slug"
            type="text"
            required
            minLength={2}
            maxLength={80}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="example-category"
            defaultValue={category?.slug ?? ""}
          />
        </FormField>

        <FormField
          label="Parent category"
          errors={stateFieldErrors(state, "parentCategoryId")}
          hint="Leave blank for a top-level category."
        >
          <select
            className={inputClassName}
            id="parent-category"
            name="parentCategoryId"
            defaultValue={category?.parentCategoryId ?? ""}
          >
            <option value="">No parent</option>
            {parentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Display order"
          errors={stateFieldErrors(state, "displayOrder")}
          hint="Lower numbers appear first."
        >
          <input
            className={inputClassName}
            id="display-order"
            name="displayOrder"
            type="number"
            required
            min={0}
            max={9999}
            step={1}
            defaultValue={category?.displayOrder ?? 0}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField
            label="Description"
            errors={stateFieldErrors(state, "description")}
          >
            <textarea
              className={inputClassName}
              id="category-description"
              name="description"
              rows={4}
              maxLength={1000}
              defaultValue={category?.description ?? ""}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-xl border bg-white p-5">
        <legend className="px-2 font-semibold">Specification fields</legend>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm text-neutral-600">
            Define the product details and filters used by this category.
          </p>
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => setFields((current) => [...current, blankField()])}
            disabled={fields.length >= 20}
          >
            Add field
          </button>
        </div>

        <FieldErrors errors={stateFieldErrors(state, "fieldSchema")} />

        {fields.length === 0 ? (
          <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
            This category has no custom specification fields yet.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, fieldIndex) => (
              <SpecificationFieldEditor
                key={`${fieldIndex}-${field.type}`}
                field={field}
                index={fieldIndex}
                onChange={(nextField) =>
                  setFields((current) =>
                    current.map((item, index) =>
                      index === fieldIndex ? nextField : item,
                    ),
                  )
                }
                onRemove={() =>
                  setFields((current) =>
                    current.filter((_, index) => index !== fieldIndex),
                  )
                }
              />
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-5 rounded-xl border bg-white p-5 md:grid-cols-2">
        <legend className="px-2 font-semibold">Search appearance</legend>
        <FormField
          label="SEO title"
          errors={stateFieldErrors(state, "seoTitle")}
        >
          <input
            className={inputClassName}
            id="seo-title"
            name="seoTitle"
            type="text"
            maxLength={70}
            defaultValue={category?.seoTitle ?? ""}
          />
        </FormField>
        <FormField
          label="SEO description"
          errors={stateFieldErrors(state, "seoDescription")}
        >
          <textarea
            className={inputClassName}
            id="seo-description"
            name="seoDescription"
            rows={3}
            maxLength={180}
            defaultValue={category?.seoDescription ?? ""}
          />
        </FormField>
      </fieldset>

      <button
        type="submit"
        disabled={pending || category?.archived}
        className="rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create category draft"
            : "Save new draft version"}
      </button>
    </form>
  );
}

export function CategoryStatusForm({
  category,
}: {
  category: CategoryDraftDTO;
}) {
  const action = category.archived
    ? restoreCategoryAction
    : archiveCategoryAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border p-5">
      <input type="hidden" name="categoryId" value={category.id} />
      <input type="hidden" name="revision" value={category.revision} />
      <h2 className="font-semibold">
        {category.archived ? "Restore category" : "Archive category"}
      </h2>
      <p className="text-sm text-neutral-600">
        {category.archived
          ? "Restoring makes this draft available for editing again."
          : "Archiving preserves all versions. Active subcategories must be handled first."}
      </p>
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-400 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      >
        {pending
          ? "Working…"
          : category.archived
            ? "Restore category"
            : "Archive category"}
      </button>
    </form>
  );
}

function SpecificationFieldEditor({
  field,
  index,
  onChange,
  onRemove,
}: {
  field: CategoryFieldDTO;
  index: number;
  onChange: (field: CategoryFieldDTO) => void;
  onRemove: () => void;
}) {
  const fieldNumber = index + 1;

  return (
    <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4">
      <legend className="px-1 text-sm font-semibold">
        Specification field {fieldNumber}
      </legend>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-600">Field {fieldNumber}</p>
        <button
          type="button"
          className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onRemove}
          aria-label={`Remove specification field ${fieldNumber}`}
        >
          Remove
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Field key">
          <input
            className={inputClassName}
            type="text"
            value={field.key}
            required
            maxLength={50}
            pattern="[a-z][a-z0-9_]*"
            onChange={(event) =>
              onChange({ ...field, key: event.target.value })
            }
          />
        </FormField>
        <FormField label="Label">
          <input
            className={inputClassName}
            type="text"
            value={field.label}
            required
            maxLength={80}
            onChange={(event) =>
              onChange({ ...field, label: event.target.value })
            }
          />
        </FormField>
        <FormField label="Type">
          <select
            className={inputClassName}
            value={field.type}
            onChange={(event) =>
              onChange(changeFieldType(field, event.target.value))
            }
          >
            {categoryFieldTypes.map((type) => (
              <option key={type} value={type}>
                {fieldTypeLabel(type)}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) =>
              onChange({ ...field, required: event.target.checked })
            }
          />
          Required on products
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.filterable}
            onChange={(event) =>
              onChange({ ...field, filterable: event.target.checked })
            }
          />
          Available as a shop filter
        </label>
      </div>

      {field.type === "measurement" ? (
        <div className="max-w-xs">
          <FormField label="Measurement unit">
            <input
              className={inputClassName}
              type="text"
              value={field.unit ?? ""}
              required
              maxLength={24}
              placeholder="ml"
              onChange={(event) =>
                onChange({ ...field, unit: event.target.value })
              }
            />
          </FormField>
        </div>
      ) : null}

      {field.type === "select" || field.type === "multi_select" ? (
        <OptionsEditor
          fieldNumber={fieldNumber}
          options={field.options ?? []}
          onChange={(options) => onChange({ ...field, options })}
        />
      ) : null}
    </fieldset>
  );
}

function OptionsEditor({
  fieldNumber,
  options,
  onChange,
}: {
  fieldNumber: number;
  options: CategoryFieldOptionDTO[];
  onChange: (options: CategoryFieldOptionDTO[]) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg bg-neutral-50 p-4">
      <legend className="px-1 text-sm font-semibold">Controlled options</legend>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-600">
          Values stay stable while labels can remain readable.
        </p>
        <button
          type="button"
          className="rounded-lg border bg-white px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => onChange([...options, { value: "", label: "" }])}
          disabled={options.length >= 30}
        >
          Add option
        </button>
      </div>
      {options.map((option, optionIndex) => (
        <div
          key={optionIndex}
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <FormField label={`Option ${optionIndex + 1} value`}>
            <input
              className={inputClassName}
              type="text"
              value={option.value}
              required
              maxLength={50}
              pattern="[a-z0-9][a-z0-9_-]*"
              onChange={(event) =>
                onChange(
                  options.map((item, index) =>
                    index === optionIndex
                      ? { ...item, value: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </FormField>
          <FormField label={`Option ${optionIndex + 1} label`}>
            <input
              className={inputClassName}
              type="text"
              value={option.label}
              required
              maxLength={80}
              onChange={(event) =>
                onChange(
                  options.map((item, index) =>
                    index === optionIndex
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </FormField>
          <button
            type="button"
            className="self-end rounded-lg border bg-white px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() =>
              onChange(options.filter((_, index) => index !== optionIndex))
            }
            aria-label={`Remove option ${optionIndex + 1} from specification field ${fieldNumber}`}
          >
            Remove
          </button>
        </div>
      ))}
    </fieldset>
  );
}

function FormField({
  label,
  hint,
  errors,
  children,
}: {
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="font-normal text-neutral-600">{hint}</span>
      ) : null}
      <FieldErrors errors={errors} />
    </label>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <span className="grid gap-1 font-normal text-red-700" role="alert">
      {errors.map((error) => (
        <span key={error}>{error}</span>
      ))}
    </span>
  );
}

function ActionFeedback({ state }: { state: CategoryActionState }) {
  if (!state.ok && state.code === "idle") {
    return null;
  }

  return (
    <p
      className={`rounded-lg p-3 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
      }`}
      aria-live="polite"
    >
      {state.ok ? "Category draft saved." : actionErrorMessage(state.code)}
    </p>
  );
}

function stateFieldErrors(state: CategoryActionState, field: string) {
  return state.ok ? undefined : state.fieldErrors?.[field];
}

function actionErrorMessage(code: string) {
  const messages: Record<string, string> = {
    validation_failed: "Review the highlighted fields and try again.",
    not_authorized: "Your administrator session is no longer authorized.",
    category_stale_revision:
      "This category changed after the page loaded. Refresh before editing again.",
    category_has_children:
      "Reassign or archive the active subcategories before continuing.",
    category_already_archived: "This category is already archived.",
    category_not_archived: "This category is not archived.",
    category_archived: "Restore this category before editing it.",
    category_not_found: "This category is no longer available.",
    category_slug_conflict: "That slug belongs to another category.",
  };

  return messages[code] ?? "The category could not be saved. Please try again.";
}

function blankField(): CategoryFieldDTO {
  return {
    key: "",
    label: "",
    type: "text",
    required: false,
    filterable: false,
  };
}

function changeFieldType(
  field: CategoryFieldDTO,
  value: string,
): CategoryFieldDTO {
  const type = categoryFieldTypes.includes(value as CategoryFieldType)
    ? (value as CategoryFieldType)
    : "text";
  const nextField: CategoryFieldDTO = {
    key: field.key,
    label: field.label,
    type,
    required: field.required,
    filterable: field.filterable,
  };

  if (type === "measurement") {
    nextField.unit = field.unit ?? "";
  }

  if (type === "select" || type === "multi_select") {
    nextField.options = field.options?.length
      ? field.options
      : [{ value: "", label: "" }];
  }

  return nextField;
}

function fieldTypeLabel(type: CategoryFieldType) {
  return type
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
