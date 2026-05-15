import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "trade-screenshots";

/**
 * Accepts either a storage path (e.g. "uid/file.png") or a legacy public URL
 * (e.g. ".../object/public/trade-screenshots/uid/file.png") and returns the
 * canonical storage path inside the bucket.
 */
export function toStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/\/trade-screenshots\/(.+)$/);
  if (m) return m[1];
  return value;
}

/** One-shot signed URL fetch. Returns null on failure. */
export async function getTradeScreenshotSignedUrl(
  value: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  const path = toStoragePath(value);
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/** React hook that resolves a screenshot value to a fresh signed URL. */
export function useSignedTradeScreenshot(value: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setUrl(null);
      return;
    }
    // Local object URLs (from previews) pass through unchanged.
    if (value.startsWith("blob:") || value.startsWith("data:")) {
      setUrl(value);
      return;
    }
    getTradeScreenshotSignedUrl(value).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  return url;
}
