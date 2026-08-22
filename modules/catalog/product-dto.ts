import type { MoneyDTO } from "@/modules/currency";

import type { CategoryFieldDTO } from "./category-dto";
import type { Availability } from "./dto";

export const productBaseCurrencies = ["AED", "USD", "PHP"] as const;
export type ProductBaseCurrency = (typeof productBaseCurrencies)[number];

export const productAvailabilityValues = [
  "available",
  "low_stock",
  "coming_soon",
  "unavailable",
] as const satisfies readonly Availability[];

export interface ProductOptionValueDraftDTO {
  key: string;
  label: string;
}

export interface ProductOptionGroupDraftDTO {
  key: string;
  name: string;
  values: ProductOptionValueDraftDTO[];
}

export interface ProductVariantDraftDTO {
  id: string | null;
  sku: string | null;
  optionValues: Record<string, string>;
  price: MoneyDTO;
  availability: Availability;
}

export interface ProductGalleryItemDTO {
  mediaAssetId: string;
  publicUrl: string;
  altText: string;
  displayOrder: number;
}

export interface ProductDraftDTO {
  id: string;
  revision: number;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  shortDescription: string;
  description: string;
  tags: string[];
  specifications: Record<string, unknown>;
  featured: boolean;
  isNew: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoSocialMediaAssetId: string | null;
  baseCurrency: ProductBaseCurrency;
  optionGroups: ProductOptionGroupDraftDTO[];
  variants: ProductVariantDraftDTO[];
  gallery: ProductGalleryItemDTO[];
  relatedProductIds: string[];
  archived: boolean;
  published: boolean;
  updatedAt: string;
}

export interface ProductDraftCommand {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  tags: string[];
  specifications: Record<string, unknown>;
  featured: boolean;
  isNew: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoSocialMediaAssetId: string | null;
  baseCurrency: ProductBaseCurrency;
  optionGroups: ProductOptionGroupDraftDTO[];
  variants: ProductVariantDraftDTO[];
  mediaAssetIds: string[];
  relatedProductIds: string[];
}

export interface ProductMutationDTO {
  productId: string;
  revision: number;
}

export interface ProductEditorCategoryDTO {
  id: string;
  name: string;
  path: string;
  fields: CategoryFieldDTO[];
}

export interface ProductRelationOptionDTO {
  id: string;
  name: string;
  archived: boolean;
}

export interface ProductEditorMediaDTO {
  id: string;
  publicUrl: string;
  altText: string;
  width: number;
  height: number;
}

export interface ProductEditorDataDTO {
  categories: ProductEditorCategoryDTO[];
  media: ProductEditorMediaDTO[];
  relationOptions: ProductRelationOptionDTO[];
}

export interface ProductFormPayloadDTO {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  tags: string[];
  specifications: Record<string, unknown>;
  featured: boolean;
  isNew: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoSocialMediaAssetId: string | null;
  baseCurrency: ProductBaseCurrency;
  optionGroups: ProductOptionGroupDraftDTO[];
  variants: Array<
    Omit<ProductVariantDraftDTO, "price"> & {
      priceMajor: string;
    }
  >;
  mediaAssetIds: string[];
  relatedProductIds: string[];
}
