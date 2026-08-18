import type { MoneyDTO } from "@/modules/currency";

export type Availability =
  "available" | "low_stock" | "coming_soon" | "unavailable";

export interface ProductCardDTO {
  id: string;
  slug: string;
  name: string;
  image: { url: string; alt: string };
  priceFrom: MoneyDTO;
  availability: Availability;
  featured: boolean;
  isNew: boolean;
}

export interface ProductVariantDTO {
  id: string;
  sku: string | null;
  optionValues: Record<string, string>;
  price: MoneyDTO;
  availability: Availability;
}
