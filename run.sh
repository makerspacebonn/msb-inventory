#!/bin/bash
bun scripts/migrate.ts && bun scripts/maintenance.ts && bun run server.ts --port 80 --host 0.0.0.0
