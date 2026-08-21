# Original Media Archive

Supabase Storage is the website's working media library, not the only copy of
the owner's source files. Maintain a separate owner-controlled archive so an
original can be recovered after accidental deletion, account loss, or a
database restore.

## Before Uploading

1. Keep the untouched original file in an owner-controlled cloud drive or
   encrypted external drive.
2. Organize originals by year and content area, for example
   `2026/products/perfumes/`.
3. Give the archived file a descriptive name. The website will replace that
   name with a UUID path for safe delivery.
4. Keep proof of license, photographer credit, or generation details beside
   the original when attribution applies.
5. Confirm that the image accurately represents the product before uploading
   it to the CMS.

## Weekly Check

1. Download or export any original added during the week that is not already
   in the owner archive.
2. Open a small sample of archived files to confirm they are readable.
3. Confirm the archive is controlled by the owner rather than a developer or
   provider account.
4. Do not store Supabase keys, customer inquiries, or other secrets beside the
   image archive.

## Recovery

If a website image is lost, locate the approved original, upload it as a new
media asset, verify its alternative text and attribution, and update the
affected content to reference the new asset. UUID object paths are immutable;
do not overwrite an old path.

The automated housekeeping work in Task 29 will report orphan candidates. It
must report them before deletion and does not replace this owner archive.
