import { cache } from "react";
import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/database-url";

export const getSiteSettings = cache(async () => {
  if (!hasDatabaseUrl()) return null;
  return db.siteSettings.findUnique({ where: { id: 1 } });
});
