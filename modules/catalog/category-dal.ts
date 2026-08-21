import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/modules/auth/server";

import type {
  CategoryDraftCommand,
  CategoryDraftDTO,
  CategoryMutationDTO,
} from "./category-dto";
import { categoryFieldsSchema } from "./category-schema";

export class CategoryRepositoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "CategoryRepositoryError";
  }
}

export async function listCategoryDrafts(): Promise<CategoryDraftDTO[]> {
  const client = await authorizedCategoryClient();
  const categoriesResult = await client
    .from("categories")
    .select(
      "id, current_draft_version_id, current_published_version_id, draft_revision, archived_at, updated_at",
    );

  if (categoriesResult.error) {
    throw new CategoryRepositoryError("category_read_failed");
  }

  const versionIds = categoriesResult.data
    .map((category) => category.current_draft_version_id)
    .filter((id): id is string => id !== null);

  if (versionIds.length === 0) {
    return [];
  }

  const versionsResult = await client
    .from("category_versions")
    .select(
      "id, category_id, parent_category_id, name, slug, description, display_order, field_schema, seo_title, seo_description",
    )
    .in("id", versionIds);

  if (versionsResult.error) {
    throw new CategoryRepositoryError("category_read_failed");
  }

  const versionsById = new Map(
    versionsResult.data.map((version) => [version.id, version]),
  );
  const namesByCategoryId = new Map(
    versionsResult.data.map((version) => [version.category_id, version.name]),
  );

  const drafts = categoriesResult.data.map((category) => {
    const version = category.current_draft_version_id
      ? versionsById.get(category.current_draft_version_id)
      : undefined;

    if (!version) {
      throw new CategoryRepositoryError("category_version_missing");
    }

    const parsedFields = categoryFieldsSchema.safeParse(version.field_schema);

    if (!parsedFields.success) {
      throw new CategoryRepositoryError("category_schema_invalid");
    }

    return {
      id: category.id,
      revision: category.draft_revision,
      parentCategoryId: version.parent_category_id,
      parentName: version.parent_category_id
        ? (namesByCategoryId.get(version.parent_category_id) ?? null)
        : null,
      name: version.name,
      slug: version.slug,
      description: version.description,
      displayOrder: version.display_order,
      fields: parsedFields.data,
      seoTitle: version.seo_title,
      seoDescription: version.seo_description,
      archived: category.archived_at !== null,
      published: category.current_published_version_id !== null,
      updatedAt: category.updated_at,
    } satisfies CategoryDraftDTO;
  });

  return drafts.sort(
    (left, right) =>
      Number(left.archived) - Number(right.archived) ||
      left.displayOrder - right.displayOrder ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
}

export async function createCategoryDraft(
  command: CategoryDraftCommand,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  const client = await authorizedCategoryClient();
  const { data, error } = await client.rpc(
    "create_category_draft",
    categoryRpcInput(command, correlationId) as CategoryCreateArgs,
  );

  return mutationResult(data, error?.message);
}

export async function updateCategoryDraft(
  categoryId: string,
  revision: number,
  command: CategoryDraftCommand,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  const client = await authorizedCategoryClient();
  const { data, error } = await client.rpc("update_category_draft", {
    input_category_id: categoryId,
    expected_revision: revision,
    ...categoryRpcInput(command, correlationId),
  } as CategoryUpdateArgs);

  return mutationResult(data, error?.message);
}

export async function setCategoryArchived(
  categoryId: string,
  revision: number,
  archived: boolean,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  const client = await authorizedCategoryClient();
  const functionName = archived ? "archive_category" : "restore_category";
  const { data, error } = await client.rpc(functionName, {
    input_category_id: categoryId,
    expected_revision: revision,
    request_correlation_id: correlationId,
  });

  return mutationResult(data, error?.message);
}

type CategoryCreateArgs =
  Database["public"]["Functions"]["create_category_draft"]["Args"];
type CategoryUpdateArgs =
  Database["public"]["Functions"]["update_category_draft"]["Args"];
type MutationResult =
  Database["public"]["CompositeTypes"]["category_mutation_result"] | null;

async function authorizedCategoryClient(): Promise<SupabaseClient<Database>> {
  if (!(await getAdminPrincipal())) {
    throw new CategoryRepositoryError("category_not_authorized");
  }

  return createServerSupabaseClient();
}

function categoryRpcInput(
  command: CategoryDraftCommand,
  correlationId: string,
) {
  return {
    input_name: command.name,
    input_slug: command.slug,
    input_parent_category_id: command.parentCategoryId,
    input_description: command.description,
    input_display_order: command.displayOrder,
    input_field_schema: command.fields as unknown as Json,
    input_seo_title: command.seoTitle,
    input_seo_description: command.seoDescription,
    request_correlation_id: correlationId,
  };
}

function mutationResult(
  result: MutationResult,
  errorMessage?: string,
): CategoryMutationDTO {
  if (errorMessage) {
    throw new CategoryRepositoryError(normalizeDatabaseError(errorMessage));
  }

  if (!result?.category_id || result.revision === null) {
    throw new CategoryRepositoryError("category_mutation_failed");
  }

  return {
    categoryId: result.category_id,
    revision: result.revision,
  };
}

function normalizeDatabaseError(message: string) {
  const controlledCodes = [
    "category_already_archived",
    "category_archived",
    "category_depth_exceeded",
    "category_has_children",
    "category_not_archived",
    "category_not_authorized",
    "category_not_found",
    "category_parent_self",
    "category_parent_unavailable",
    "category_slug_conflict",
    "category_stale_revision",
  ];

  return (
    controlledCodes.find((code) => message.includes(code)) ??
    "category_mutation_failed"
  );
}
