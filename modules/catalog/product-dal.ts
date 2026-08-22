import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminPrincipal } from "@/modules/auth/server";

import type { Availability } from "./dto";
import {
  productBaseCurrencies,
  type ProductBaseCurrency,
  type ProductDraftCommand,
  type ProductDraftDTO,
  type ProductMutationDTO,
  type ProductOptionGroupDraftDTO,
  type ProductVariantDraftDTO,
} from "./product-dto";

export class ProductRepositoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ProductRepositoryError";
  }
}

export async function listProductDraftRecords(): Promise<ProductDraftDTO[]> {
  const client = await authorizedProductClient();
  const productsResult = await client
    .from("products")
    .select(
      "id, current_draft_version_id, current_published_version_id, draft_revision, archived_at, updated_at",
    );

  if (productsResult.error) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const versionIds = productsResult.data
    .map((product) => product.current_draft_version_id)
    .filter((id): id is string => id !== null);

  if (versionIds.length === 0) {
    return [];
  }

  const [
    versionsResult,
    groupsResult,
    variantsResult,
    mediaResult,
    relationsResult,
  ] = await Promise.all([
    client
      .from("product_versions")
      .select(
        "id, product_id, category_id, name, slug, short_description, description, tags, specifications, featured, is_new, seo_title, seo_description, seo_social_media_asset_id, base_currency",
      )
      .in("id", versionIds),
    client
      .from("product_option_groups")
      .select("id, product_version_id, group_key, name, display_order")
      .in("product_version_id", versionIds),
    client
      .from("product_variant_versions")
      .select(
        "id, product_version_id, product_variant_id, sku, price_minor, currency, availability",
      )
      .in("product_version_id", versionIds),
    client
      .from("product_media")
      .select("product_version_id, media_asset_id, display_order")
      .in("product_version_id", versionIds),
    client
      .from("product_related_products")
      .select("product_version_id, related_product_id, display_order")
      .in("product_version_id", versionIds),
  ]);

  if (
    versionsResult.error ||
    groupsResult.error ||
    variantsResult.error ||
    mediaResult.error ||
    relationsResult.error
  ) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const groupIds = groupsResult.data.map((group) => group.id);
  const variantVersionIds = variantsResult.data.map((variant) => variant.id);
  const mediaIds = [
    ...new Set(mediaResult.data.map((item) => item.media_asset_id)),
  ];
  const categoryIds = [
    ...new Set(versionsResult.data.map((version) => version.category_id)),
  ];

  const [valuesResult, mappingsResult, assetsResult, categoriesResult] =
    await Promise.all([
      groupIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : client
            .from("product_option_values")
            .select("id, option_group_id, value_key, label, display_order")
            .in("option_group_id", groupIds),
      variantVersionIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : client
            .from("product_variant_option_values")
            .select(
              "product_variant_version_id, option_group_id, option_value_id",
            )
            .in("product_variant_version_id", variantVersionIds),
      mediaIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : client
            .from("media_assets")
            .select("id, object_path, alt_text, status")
            .in("id", mediaIds),
      client
        .from("categories")
        .select("id, current_draft_version_id")
        .in("id", categoryIds),
    ]);

  if (
    valuesResult.error ||
    mappingsResult.error ||
    assetsResult.error ||
    categoriesResult.error
  ) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const categoryVersionIds = categoriesResult.data
    .map((category) => category.current_draft_version_id)
    .filter((id): id is string => id !== null);
  const categoryVersionsResult =
    categoryVersionIds.length === 0
      ? { data: [], error: null }
      : await client
          .from("category_versions")
          .select("category_id, parent_category_id, name")
          .in("id", categoryVersionIds);

  if (categoryVersionsResult.error) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const parentCategoryIds = categoryVersionsResult.data
    .map((category) => category.parent_category_id)
    .filter((id): id is string => id !== null);
  const parentCategoriesResult =
    parentCategoryIds.length === 0
      ? { data: [], error: null }
      : await client
          .from("categories")
          .select("id, current_draft_version_id")
          .in("id", parentCategoryIds);

  if (parentCategoriesResult.error) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const parentVersionIds = parentCategoriesResult.data
    .map((category) => category.current_draft_version_id)
    .filter((id): id is string => id !== null);
  const parentVersionsResult =
    parentVersionIds.length === 0
      ? { data: [], error: null }
      : await client
          .from("category_versions")
          .select("category_id, name")
          .in("id", parentVersionIds);

  if (parentVersionsResult.error) {
    throw new ProductRepositoryError("product_read_failed");
  }

  const versionsById = new Map(
    versionsResult.data.map((version) => [version.id, version]),
  );
  const valuesById = new Map(
    valuesResult.data.map((value) => [value.id, value]),
  );
  const groupsById = new Map(
    groupsResult.data.map((group) => [group.id, group]),
  );
  const assetsById = new Map(
    assetsResult.data.map((asset) => [asset.id, asset]),
  );
  const categoryVersionsById = new Map(
    categoryVersionsResult.data.map((category) => [
      category.category_id,
      category,
    ]),
  );
  const parentNamesById = new Map(
    parentVersionsResult.data.map((category) => [
      category.category_id,
      category.name,
    ]),
  );
  const mappingsByVariantId = groupedBy(
    mappingsResult.data,
    (mapping) => mapping.product_variant_version_id,
  );
  const groupsByVersionId = groupedBy(
    groupsResult.data,
    (group) => group.product_version_id,
  );
  const valuesByGroupId = groupedBy(
    valuesResult.data,
    (value) => value.option_group_id,
  );
  const variantsByVersionId = groupedBy(
    variantsResult.data,
    (variant) => variant.product_version_id,
  );
  const mediaByVersionId = groupedBy(
    mediaResult.data,
    (item) => item.product_version_id,
  );
  const relationsByVersionId = groupedBy(
    relationsResult.data,
    (relation) => relation.product_version_id,
  );

  return productsResult.data
    .map((product) => {
      const version = product.current_draft_version_id
        ? versionsById.get(product.current_draft_version_id)
        : undefined;
      if (!version) {
        throw new ProductRepositoryError("product_version_missing");
      }

      const category = categoryVersionsById.get(version.category_id);
      if (!category) {
        throw new ProductRepositoryError("product_category_missing");
      }

      const parentName = category.parent_category_id
        ? parentNamesById.get(category.parent_category_id)
        : null;
      const baseCurrency = parseBaseCurrency(version.base_currency);
      const optionGroups = (groupsByVersionId.get(version.id) ?? [])
        .sort((left, right) => left.display_order - right.display_order)
        .map(
          (group) =>
            ({
              key: group.group_key,
              name: group.name,
              values: (valuesByGroupId.get(group.id) ?? [])
                .sort((left, right) => left.display_order - right.display_order)
                .map((value) => ({ key: value.value_key, label: value.label })),
            }) satisfies ProductOptionGroupDraftDTO,
        );

      const variants = (variantsByVersionId.get(version.id) ?? []).map(
        (variant) => {
          const optionValues: Record<string, string> = {};
          for (const mapping of mappingsByVariantId.get(variant.id) ?? []) {
            const group = groupsById.get(mapping.option_group_id);
            const value = valuesById.get(mapping.option_value_id);
            if (!group || !value) {
              throw new ProductRepositoryError(
                "product_variant_options_missing",
              );
            }
            optionValues[group.group_key] = value.value_key;
          }

          return {
            id: variant.product_variant_id,
            sku: variant.sku,
            optionValues,
            price: {
              amountMinor: String(variant.price_minor),
              currency: variant.currency,
            },
            availability: variant.availability as Availability,
          } satisfies ProductVariantDraftDTO;
        },
      );

      const gallery = (mediaByVersionId.get(version.id) ?? [])
        .sort((left, right) => left.display_order - right.display_order)
        .map((item) => {
          const asset = assetsById.get(item.media_asset_id);
          if (!asset || asset.status !== "ready") {
            throw new ProductRepositoryError("product_media_missing");
          }
          return {
            mediaAssetId: asset.id,
            publicUrl: client.storage
              .from("media")
              .getPublicUrl(asset.object_path).data.publicUrl,
            altText: asset.alt_text,
            displayOrder: item.display_order,
          };
        });

      if (!isRecord(version.specifications)) {
        throw new ProductRepositoryError("product_specifications_invalid");
      }

      return {
        id: product.id,
        revision: product.draft_revision,
        name: version.name,
        slug: version.slug,
        categoryId: version.category_id,
        categoryName: category.name,
        categoryPath: parentName
          ? `${parentName} / ${category.name}`
          : category.name,
        shortDescription: version.short_description,
        description: version.description,
        tags: version.tags,
        specifications: version.specifications,
        featured: version.featured,
        isNew: version.is_new,
        seoTitle: version.seo_title,
        seoDescription: version.seo_description,
        seoSocialMediaAssetId: version.seo_social_media_asset_id,
        baseCurrency,
        optionGroups,
        variants,
        gallery,
        relatedProductIds: (relationsByVersionId.get(version.id) ?? [])
          .sort((left, right) => left.display_order - right.display_order)
          .map((relation) => relation.related_product_id),
        archived: product.archived_at !== null,
        published: product.current_published_version_id !== null,
        updatedAt: product.updated_at,
      } satisfies ProductDraftDTO;
    })
    .sort(
      (left, right) =>
        Number(left.archived) - Number(right.archived) ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );
}

export async function createProductDraftRecord(
  command: ProductDraftCommand,
  correlationId: string,
): Promise<ProductMutationDTO> {
  const client = await authorizedProductClient();
  const { data, error } = await client.rpc(
    "create_product_draft",
    productRpcInput(command, correlationId) as ProductCreateArgs,
  );
  return mutationResult(data, error?.message);
}

export async function updateProductDraftRecord(
  productId: string,
  revision: number,
  command: ProductDraftCommand,
  correlationId: string,
): Promise<ProductMutationDTO> {
  const client = await authorizedProductClient();
  const { data, error } = await client.rpc("update_product_draft", {
    input_product_id: productId,
    expected_revision: revision,
    ...productRpcInput(command, correlationId),
  } as ProductUpdateArgs);
  return mutationResult(data, error?.message);
}

export async function setProductArchivedRecord(
  productId: string,
  revision: number,
  archived: boolean,
  correlationId: string,
): Promise<ProductMutationDTO> {
  const client = await authorizedProductClient();
  const functionName = archived ? "archive_product" : "restore_product";
  const { data, error } = await client.rpc(functionName, {
    input_product_id: productId,
    expected_revision: revision,
    request_correlation_id: correlationId,
  });
  return mutationResult(data, error?.message);
}

type ProductCreateArgs =
  Database["public"]["Functions"]["create_product_draft"]["Args"];
type ProductUpdateArgs =
  Database["public"]["Functions"]["update_product_draft"]["Args"];
type MutationResult =
  Database["public"]["CompositeTypes"]["product_mutation_result"] | null;

async function authorizedProductClient(): Promise<SupabaseClient<Database>> {
  if (!(await getAdminPrincipal())) {
    throw new ProductRepositoryError("product_not_authorized");
  }
  return createServerSupabaseClient();
}

function productRpcInput(command: ProductDraftCommand, correlationId: string) {
  return {
    input_name: command.name,
    input_slug: command.slug,
    input_category_id: command.categoryId,
    input_short_description: command.shortDescription,
    input_description: command.description,
    input_tags: command.tags,
    input_specifications: command.specifications as Json,
    input_featured: command.featured,
    input_is_new: command.isNew,
    input_seo_title: command.seoTitle,
    input_seo_description: command.seoDescription,
    input_seo_social_media_asset_id: command.seoSocialMediaAssetId,
    input_base_currency: command.baseCurrency,
    input_option_groups: command.optionGroups as unknown as Json,
    input_variants: command.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      priceMinor: variant.price.amountMinor,
      availability: variant.availability,
      optionValues: variant.optionValues,
    })) as unknown as Json,
    input_media_asset_ids: command.mediaAssetIds,
    input_related_product_ids: command.relatedProductIds,
    request_correlation_id: correlationId,
  };
}

function mutationResult(
  result: MutationResult,
  errorMessage?: string,
): ProductMutationDTO {
  if (errorMessage) {
    throw new ProductRepositoryError(normalizeProductError(errorMessage));
  }
  if (!result?.product_id || result.revision === null) {
    throw new ProductRepositoryError("product_mutation_failed");
  }
  return { productId: result.product_id, revision: result.revision };
}

function normalizeProductError(message: string) {
  const controlledCodes = [
    "product_already_archived",
    "product_archived",
    "product_category_unavailable",
    "product_media_invalid",
    "product_not_archived",
    "product_not_authorized",
    "product_not_found",
    "product_option_groups_invalid",
    "product_relations_invalid",
    "product_seo_media_invalid",
    "product_sku_conflict",
    "product_slug_conflict",
    "product_specifications_invalid",
    "product_stale_revision",
    "product_tags_invalid",
    "product_variant_combination_duplicate",
    "product_variant_identity_invalid",
    "product_variant_option_invalid",
    "product_variant_options_incomplete",
    "product_variants_invalid",
  ];
  return (
    controlledCodes.find((code) => message.includes(code)) ??
    "product_mutation_failed"
  );
}

function groupedBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const itemKey = key(item);
    groups.set(itemKey, [...(groups.get(itemKey) ?? []), item]);
  }
  return groups;
}

function parseBaseCurrency(value: string): ProductBaseCurrency {
  if (productBaseCurrencies.includes(value as ProductBaseCurrency)) {
    return value as ProductBaseCurrency;
  }
  throw new ProductRepositoryError("product_currency_invalid");
}

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
