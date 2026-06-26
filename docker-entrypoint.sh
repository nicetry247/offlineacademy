#!/bin/sh
set -e

# Ensure bind-mounted runtime folders exist.
mkdir -p /app/My_Courses /app/prisma

# If the container starts as root, make common bind mounts writable by the app user.
# This helps when users create ./prisma/dev.db or ./My_Courses on the host first.
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /app/My_Courses /app/prisma 2>/dev/null || true
fi

# A fresh Docker deployment often bind-mounts an empty SQLite file at /app/prisma/dev.db.
# Initialize/update the Prisma schema before the Next.js server starts.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Initializing SQLite schema with Prisma..."
  gosu nextjs:nodejs ./node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma --skip-generate
fi

exec gosu nextjs:nodejs "$@"
