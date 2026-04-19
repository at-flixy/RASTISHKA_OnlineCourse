#!/bin/sh
set -e

echo "=== Running database migrations ==="
npm run db:migrate:deploy

echo "=== Starting Next.js server ==="
exec node .next/standalone/server.js
