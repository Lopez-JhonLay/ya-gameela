import type { NextConfig } from "next";

const mediaRemotePatterns = mediaPatterns(process.env.NEXT_PUBLIC_SUPABASE_URL);
const allowLocalMediaImages = isLoopbackUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    dangerouslyAllowLocalIP: allowLocalMediaImages,
    remotePatterns: mediaRemotePatterns,
  },
};

export default nextConfig;

function mediaPatterns(supabaseUrl: string | undefined): URL[] {
  if (!supabaseUrl) {
    return [];
  }

  try {
    const pattern = new URL(supabaseUrl);
    pattern.pathname = "/storage/v1/object/public/media/**";
    pattern.search = "";
    pattern.hash = "";
    return [pattern];
  } catch {
    return [];
  }
}

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}
