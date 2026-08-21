import "server-only";

import type {
  CategoryDraftCommand,
  CategoryDraftDTO,
  CategoryMutationDTO,
} from "./category-dto";
import {
  createCategoryDraft as createCategoryDraftRecord,
  listCategoryDrafts as listCategoryDraftRecords,
  setCategoryArchived as setCategoryArchivedRecord,
  updateCategoryDraft as updateCategoryDraftRecord,
} from "./category-dal";

export async function getCategoryDrafts(): Promise<CategoryDraftDTO[]> {
  return listCategoryDraftRecords();
}

export async function createCategory(
  command: CategoryDraftCommand,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  return createCategoryDraftRecord(command, correlationId);
}

export async function updateCategory(
  categoryId: string,
  revision: number,
  command: CategoryDraftCommand,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  return updateCategoryDraftRecord(
    categoryId,
    revision,
    command,
    correlationId,
  );
}

export async function changeCategoryArchivedState(
  categoryId: string,
  revision: number,
  archived: boolean,
  correlationId: string,
): Promise<CategoryMutationDTO> {
  return setCategoryArchivedRecord(
    categoryId,
    revision,
    archived,
    correlationId,
  );
}
