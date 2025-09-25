import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a usable public URL for images that may be stored as:
 * - Full https URL
 * - Storage path like "club-logos/filename.png"
 */
export function resolvePublicUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  // If we only have a path within the club-logos bucket
  const clubLogosPrefix = /^club-logos\/?/i;
  if (clubLogosPrefix.test(url)) {
    const path = url.replace(clubLogosPrefix, "");
    const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  // Return as-is when unsure (caller should still have onError fallback)
  return url;
}

/**
 * Append a cache-busting query param so updated images aren’t served stale.
 */
export function withCacheBuster(url: string, seed?: string | number): string {
  const v = seed ?? Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}
