alter table public.media_assets
drop constraint media_assets_verified_metadata;

alter table public.media_assets
add constraint media_assets_verified_metadata check (
  (
    status in ('pending', 'rejected')
    and mime_type is null
    and width is null
    and height is null
    and byte_size is null
    and checksum_sha256 is null
    and verified_at is null
  )
  or (
    status = 'ready'
    and mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
    and width between 1 and 12000
    and height between 1 and 12000
    and width::bigint * height::bigint <= 64000000
    and byte_size between 1 and 10485760
    and checksum_sha256 ~ '^[0-9a-f]{64}$'
    and verified_at is not null
  )
  or (
    status = 'deleting'
    and (
      (
        mime_type is null
        and width is null
        and height is null
        and byte_size is null
        and checksum_sha256 is null
        and verified_at is null
      )
      or (
        mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
        and width between 1 and 12000
        and height between 1 and 12000
        and width::bigint * height::bigint <= 64000000
        and byte_size between 1 and 10485760
        and checksum_sha256 ~ '^[0-9a-f]{64}$'
        and verified_at is not null
      )
    )
  )
);
