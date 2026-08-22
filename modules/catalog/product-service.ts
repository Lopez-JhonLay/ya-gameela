import "server-only";

import { getMediaLibrary } from "@/modules/media/server";

import { getCategoryDrafts } from "./category-service";
import {
  createProductDraftRecord,
  listProductDraftRecords,
  setProductArchivedRecord,
  updateProductDraftRecord,
} from "./product-dal";
import type {
  ProductDraftCommand,
  ProductDraftDTO,
  ProductEditorDataDTO,
  ProductMutationDTO,
} from "./product-dto";

export async function getProductDrafts(): Promise<ProductDraftDTO[]> {
  return listProductDraftRecords();
}

export async function getProductDraft(
  productId: string,
): Promise<ProductDraftDTO | null> {
  return (
    (await listProductDraftRecords()).find(
      (product) => product.id === productId,
    ) ?? null
  );
}

export async function getProductEditorData(
  currentProductId?: string,
): Promise<ProductEditorDataDTO> {
  const [categories, mediaLibrary, products] = await Promise.all([
    getCategoryDrafts(),
    getMediaLibrary(),
    getProductDrafts(),
  ]);

  return {
    categories: categories
      .filter((category) => !category.archived)
      .map((category) => ({
        id: category.id,
        name: category.name,
        path: category.parentName
          ? `${category.parentName} / ${category.name}`
          : category.name,
        fields: category.fields,
      })),
    media: mediaLibrary.assets
      .filter(
        (asset) =>
          asset.status === "ready" &&
          asset.publicUrl !== null &&
          asset.width !== null &&
          asset.height !== null,
      )
      .map((asset) => ({
        id: asset.id,
        publicUrl: asset.publicUrl!,
        altText: asset.altText,
        width: asset.width!,
        height: asset.height!,
      })),
    relationOptions: products
      .filter((product) => product.id !== currentProductId && !product.archived)
      .map((product) => ({
        id: product.id,
        name: product.name,
        archived: product.archived,
      })),
  };
}

export async function createProduct(
  command: ProductDraftCommand,
  correlationId: string,
): Promise<ProductMutationDTO> {
  return createProductDraftRecord(command, correlationId);
}

export async function updateProduct(
  productId: string,
  revision: number,
  command: ProductDraftCommand,
  correlationId: string,
): Promise<ProductMutationDTO> {
  return updateProductDraftRecord(productId, revision, command, correlationId);
}

export async function changeProductArchivedState(
  productId: string,
  revision: number,
  archived: boolean,
  correlationId: string,
): Promise<ProductMutationDTO> {
  return setProductArchivedRecord(productId, revision, archived, correlationId);
}
