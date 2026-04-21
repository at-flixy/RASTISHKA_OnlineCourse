#!/usr/bin/env node

async function main() {
  const { spawn } = await import("node:child_process");

  const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--via-railway");
  const isViaRailway = process.argv.includes("--via-railway");

  function exitWithChild(child) {
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
    });
  }

  function spawnCommand(command, args, envOverrides = {}) {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envOverrides,
      },
      shell: process.platform === "win32",
    });

    exitWithChild(child);
  }

  const directDatabaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
  const publicDatabaseUrl = process.env.DATABASE_PUBLIC_URL ?? null;

  if (!directDatabaseUrl && !isViaRailway) {
    spawnCommand("railway", ["run", "node", "scripts/dev.js", "--via-railway", ...forwardedArgs]);
    return;
  }

  if (!directDatabaseUrl && !publicDatabaseUrl) {
    console.error("DATABASE_URL is required. Configure a local .env or use Railway-linked variables.");
    process.exit(1);
  }

  const shouldUsePublicRailwayUrl =
    typeof directDatabaseUrl === "string" &&
    directDatabaseUrl.includes(".railway.internal") &&
    typeof publicDatabaseUrl === "string";

  spawnCommand(
    "node",
    ["node_modules/next/dist/bin/next", "dev", ...forwardedArgs],
    {
      NODE_ENV: "development",
      ...(shouldUsePublicRailwayUrl ? { DATABASE_URL: publicDatabaseUrl } : {}),
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
