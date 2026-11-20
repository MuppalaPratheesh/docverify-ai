#!/bin/sh
set -eu

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
WAIT_ATTEMPTS="${POSTGRES_WAIT_ATTEMPTS:-60}"

echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

i=0
while [ "$i" -lt "$WAIT_ATTEMPTS" ]; do
  if node -e "
    const net = require('net');
    const socket = net.connect({ host: '${POSTGRES_HOST}', port: ${POSTGRES_PORT} }, () => {
      socket.end();
      process.exit(0);
    });
    socket.on('error', () => process.exit(1));
    setTimeout(() => process.exit(1), 2000);
  "; then
    echo "PostgreSQL is reachable."
    break
  fi

  i=$((i + 1))
  if [ "$i" -eq "$WAIT_ATTEMPTS" ]; then
    echo "PostgreSQL did not become ready in time." >&2
    exit 1
  fi

  sleep 1
done

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "Seeding synthetic baseline data..."
  ./node_modules/.bin/prisma db seed
fi

echo "Starting DocVerify AI API..."
exec node dist/server.js
