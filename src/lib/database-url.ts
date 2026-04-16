function findDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (directUrl) {
    return directUrl;
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("HEROKU_POSTGRESQL_") && key.endsWith("_URL") && value) {
      return value;
    }
  }

  return undefined;
}

function ensureSslMode(databaseUrl: string) {
  const url = new URL(databaseUrl);

  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

export function hasDatabaseUrl() {
  return Boolean(findDatabaseUrl());
}

export function getDatabaseUrl() {
  const databaseUrl = findDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return ensureSslMode(databaseUrl);
}
