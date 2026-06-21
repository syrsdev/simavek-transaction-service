#!/bin/sh
set -e

echo "Menjalankan migration..."
npx prisma migrate deploy

echo "Menjalankan aplikasi..."
node dist/main