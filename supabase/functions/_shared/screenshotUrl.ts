/**
 * Validates that a client-supplied screenshot URL points at this project's
 * `trade-screenshots` Supabase Storage bucket. Prevents the AI gateway from
 * being used to fetch arbitrary external URLs (SSRF / credit exhaustion).
 */
const BUCKET = "trade-screenshots";

export function isAllowedScreenshotUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4000) return false;

  const base = Deno.env.get("SUPABASE_URL");
  if (!base) return false;

  let url: URL;
  let allowed: URL;
  try {
    url = new URL(value);
    allowed = new URL(base);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.hostname !== allowed.hostname) return false;

  return (
    url.pathname.startsWith(`/storage/v1/object/sign/${BUCKET}/`) ||
    url.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`) ||
    url.pathname.startsWith(`/storage/v1/object/authenticated/${BUCKET}/`)
  );
}

export function invalidScreenshotResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Invalid screenshot URL" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
