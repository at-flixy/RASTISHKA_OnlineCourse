export function getSiteUrl() {
  const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!siteUrl) {
    throw new Error("SITE_URL or NEXT_PUBLIC_APP_URL is required");
  }

  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}
