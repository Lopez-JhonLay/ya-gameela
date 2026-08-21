export const categoryFieldTypes = [
  "text",
  "number",
  "measurement",
  "boolean",
  "select",
  "multi_select",
] as const;

export type CategoryFieldType = (typeof categoryFieldTypes)[number];

export interface CategoryFieldOptionDTO {
  value: string;
  label: string;
}

export interface CategoryFieldDTO {
  key: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  filterable: boolean;
  unit?: string;
  options?: CategoryFieldOptionDTO[];
}

export interface CategoryDraftDTO {
  id: string;
  revision: number;
  parentCategoryId: string | null;
  parentName: string | null;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  fields: CategoryFieldDTO[];
  seoTitle: string | null;
  seoDescription: string | null;
  archived: boolean;
  published: boolean;
  updatedAt: string;
}

export interface CategoryDraftCommand {
  name: string;
  slug: string;
  parentCategoryId: string | null;
  description: string | null;
  displayOrder: number;
  fields: CategoryFieldDTO[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface CategoryMutationDTO {
  categoryId: string;
  revision: number;
}
