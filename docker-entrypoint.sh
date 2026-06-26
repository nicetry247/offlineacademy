#!/bin/sh
set -e

# Ensure bind-mounted runtime folders exist.
mkdir -p /app/My_Courses /app/prisma

# If the container starts as root, fix permissions.
if [ "$(id -u)" = "0" ]; then
  # For the database, we MUST own it to write to it. This folder is small, so -R is safe.
  chown -R nextjs:nodejs /app/prisma 2>/dev/null || true
  
  # For the courses, we just need to make sure the nextjs user can READ and TRAVERSE it.
  # We avoid chown -R here because doing it on 500GB of videos takes forever on boot.
  chmod -R 755 /app/My_Courses 2>/dev/null || true
fi

# A fresh Docker deployment often bind-mounts an empty SQLite file.
# Initialize/update the Prisma schema before the Next.js server starts.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Initializing SQLite schema with Prisma..."
  gosu nextjs:nodejs ./node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma --skip-generate
fi

echo "Booting OfflineAcademy..."
exec gosu nextjs:nodejs "$@"