import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catalog/category-actions", () => ({
  createCategoryAction: vi.fn(),
  updateCategoryAction: vi.fn(),
  archiveCategoryAction: vi.fn(),
  restoreCategoryAction: vi.fn(),
}));

import {
  CategoryForm,
  CategoryStatusForm,
} from "@/modules/catalog/category-form";
import type { CategoryDraftDTO } from "@/modules/catalog/category-dto";

describe("category CMS form", () => {
  it("builds specification fields with labelled keyboard controls", async () => {
    const user = userEvent.setup();
    render(<CategoryForm mode="create" parentOptions={[]} />);

    await user.click(screen.getByRole("button", { name: "Add field" }));

    expect(
      screen.getByRole("group", { name: "Specification field 1" }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Type"), "measurement");
    expect(screen.getByLabelText("Measurement unit")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Type"), "multi_select");
    expect(
      screen.getByRole("button", { name: "Add option" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Option 1 value")).toBeInTheDocument();
  });

  it("shows parent choices and disables editing for archived categories", () => {
    const parent = category({ id: "parent-id", name: "Perfumes" });
    const archived = category({ archived: true });

    render(
      <CategoryForm
        mode="update"
        category={archived}
        parentOptions={[parent]}
      />,
    );

    expect(
      screen.getByRole("option", { name: "Perfumes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save new draft version" }),
    ).toBeDisabled();
  });

  it("reloads saved parent data when the category revision changes", async () => {
    const user = userEvent.setup();
    const bags = category({ id: "bags-id", name: "Bags" });
    const initialCategory = category({ revision: 1 });
    const { rerender } = render(
      <CategoryForm
        mode="update"
        category={initialCategory}
        parentOptions={[bags]}
      />,
    );
    const parentSelect = screen.getByLabelText(/^Parent category/);

    await user.selectOptions(parentSelect, "bags-id");
    parentSelect.closest("form")?.reset();
    expect(parentSelect).toHaveValue("");

    rerender(
      <CategoryForm
        mode="update"
        category={category({
          revision: 2,
          parentCategoryId: "bags-id",
          parentName: "Bags",
        })}
        parentOptions={[bags]}
      />,
    );

    expect(screen.getByLabelText(/^Parent category/)).toHaveValue("bags-id");
  });

  it("uses an explicit restore action for archived categories", () => {
    render(<CategoryStatusForm category={category({ archived: true })} />);

    expect(
      screen.getByRole("button", { name: "Restore category" }),
    ).toBeInTheDocument();
  });
});

function category(overrides: Partial<CategoryDraftDTO> = {}): CategoryDraftDTO {
  return {
    id: "77000000-0000-4000-8000-000000000001",
    revision: 1,
    parentCategoryId: null,
    parentName: null,
    name: "Test category",
    slug: "test-category",
    description: null,
    displayOrder: 0,
    fields: [],
    seoTitle: null,
    seoDescription: null,
    archived: false,
    published: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
