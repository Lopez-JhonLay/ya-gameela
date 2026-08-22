export function productErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    not_authorized: "Your administrator session is no longer authorized.",
    product_already_archived: "This product is already archived.",
    product_archived: "Restore this product before editing it.",
    product_category_unavailable: "Choose an active category.",
    product_media_invalid: "Choose 1 to 12 verified gallery images.",
    product_not_archived: "This product is not archived.",
    product_not_authorized:
      "Your administrator session is no longer authorized.",
    product_not_found: "This product no longer exists.",
    product_option_groups_invalid: "Review the option groups and their values.",
    product_relations_invalid:
      "Choose active related products other than this product.",
    product_seo_media_invalid: "Choose a verified SEO social image.",
    product_sku_conflict: "A SKU is already assigned to another variant.",
    product_slug_conflict: "This slug is reserved by another product.",
    product_specifications_invalid:
      "Review the selected category specifications.",
    product_stale_revision:
      "This draft changed in another tab. Refresh before saving again.",
    product_tags_invalid: "Use unique lowercase tag slugs.",
    product_variant_combination_duplicate:
      "Each variant combination must be unique.",
    product_variant_identity_invalid:
      "One variant no longer belongs to this product.",
    product_variant_option_invalid:
      "Choose values defined by the option groups.",
    product_variant_options_incomplete:
      "Choose one value from every option group.",
    product_variants_invalid:
      "Review product variants, prices, SKUs, and availability.",
    validation_failed: "Please fix the following before saving:",
  };
  return messages[code] ?? "The product operation failed safely. Try again.";
}
