import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/catalog/product-actions", () => ({
  createProductAction: vi.fn(),
  updateProductAction: vi.fn(),
  archiveProductAction: vi.fn(),
  restoreProductAction: vi.fn(),
}));
vi.mock("@/modules/catalog/product-messages", () => ({
  productErrorMessage: (code: string) => code,
}));

import { ProductForm, ProductStatusForm } from "@/modules/catalog/product-form";
import type {
  ProductDraftDTO,
  ProductEditorDataDTO,
} from "@/modules/catalog/product-dto";

describe("product CMS form", () => {
  it("loads category fields and generates accessible variant combinations", async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" editorData={editorData()} />);

    await user.selectOptions(screen.getByLabelText("Category"), "category-id");
    expect(screen.getByLabelText(/Volume \(required\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add option group" }));
    await user.clear(screen.getByLabelText("Group 1 name"));
    await user.type(screen.getByLabelText("Group 1 name"), "Volume");
    await user.clear(screen.getByLabelText(/Group 1 key/));
    await user.type(screen.getByLabelText(/Group 1 key/), "volume");
    await user.type(screen.getByLabelText("Value 1 label"), "50 ml");
    await user.clear(screen.getByLabelText("Value 1 key"));
    await user.type(screen.getByLabelText("Value 1 key"), "50ml");
    await user.click(screen.getByRole("button", { name: "Add value" }));
    await user.type(screen.getByLabelText("Value 2 label"), "100 ml");
    await user.type(screen.getByLabelText("Value 2 key"), "100ml");
    await user.click(
      screen.getByRole("button", { name: "Generate variant combinations" }),
    );

    expect(
      screen.getByText("2 variant combinations generated."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Variant 1 price (AED)")).toBeInTheDocument();
    expect(screen.getByLabelText("Variant 2 price (AED)")).toBeInTheDocument();
  });

  it("selects verified media and provides keyboard-operable ordering", async () => {
    const user = userEvent.setup();
    render(<ProductForm mode="create" editorData={editorData()} />);

    await user.click(screen.getByLabelText(/First perfume image/));
    await user.click(screen.getByLabelText(/Second perfume image/));

    expect(
      screen.getAllByRole("button", { name: "Move up" })[0],
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Move down" })[0],
    ).toBeEnabled();
  });

  it("uses the saved revision after an image is removed", async () => {
    const user = userEvent.setup();
    const firstRevision = product({
      revision: 1,
      gallery: [galleryItem("media-1", 0), galleryItem("media-2", 1)],
    });
    const { rerender } = render(
      <ProductForm
        key={firstRevision.revision}
        mode="update"
        product={firstRevision}
        editorData={editorData()}
      />,
    );

    const secondImage = screen.getByLabelText(/Second perfume image/);
    expect(secondImage).toBeChecked();
    await user.click(secondImage);
    expect(secondImage).not.toBeChecked();

    const savedRevision = product({
      revision: 2,
      gallery: [galleryItem("media-1", 0)],
    });
    rerender(
      <ProductForm
        key={savedRevision.revision}
        mode="update"
        product={savedRevision}
        editorData={editorData()}
      />,
    );

    expect(screen.getByLabelText(/First perfume image/)).toBeChecked();
    expect(screen.getByLabelText(/Second perfume image/)).not.toBeChecked();
  });

  it("disables editing and exposes restore for archived products", () => {
    const archived = product({ archived: true });
    render(
      <>
        <ProductForm
          mode="update"
          product={archived}
          editorData={editorData()}
        />
        <ProductStatusForm product={archived} />
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Save product draft" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Restore product" }),
    ).toBeInTheDocument();
  });
});

function editorData(): ProductEditorDataDTO {
  return {
    categories: [
      {
        id: "category-id",
        name: "Perfumes",
        path: "Perfumes",
        fields: [
          {
            key: "volume",
            label: "Volume",
            type: "measurement",
            required: true,
            filterable: true,
            unit: "ml",
          },
        ],
      },
    ],
    media: [
      {
        id: "media-1",
        publicUrl: "http://localhost/media-1.jpg",
        altText: "First perfume image",
        width: 100,
        height: 100,
      },
      {
        id: "media-2",
        publicUrl: "http://localhost/media-2.jpg",
        altText: "Second perfume image",
        width: 100,
        height: 100,
      },
    ],
    relationOptions: [],
  };
}

function product(overrides: Partial<ProductDraftDTO> = {}): ProductDraftDTO {
  return {
    id: "85000000-0000-4000-8000-000000000001",
    revision: 1,
    name: "Rose perfume",
    slug: "rose-perfume",
    categoryId: "category-id",
    categoryName: "Perfumes",
    categoryPath: "Perfumes",
    shortDescription: "A floral perfume.",
    description: "A complete floral perfume description.",
    tags: ["floral"],
    specifications: { volume: 50 },
    featured: false,
    isNew: true,
    seoTitle: null,
    seoDescription: null,
    seoSocialMediaAssetId: null,
    baseCurrency: "AED",
    optionGroups: [],
    variants: [
      {
        id: "86000000-0000-4000-8000-000000000001",
        sku: null,
        optionValues: {},
        price: { amountMinor: "12500", currency: "AED" },
        availability: "available",
      },
    ],
    gallery: [],
    relatedProductIds: [],
    archived: false,
    published: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function galleryItem(mediaAssetId: string, displayOrder: number) {
  return {
    mediaAssetId,
    publicUrl: `http://localhost/${mediaAssetId}.jpg`,
    altText:
      mediaAssetId === "media-1"
        ? "First perfume image"
        : "Second perfume image",
    displayOrder,
  };
}
