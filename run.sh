#!/bin/bash
bun db:push --force && bun scripts/maintenance.ts && bun run server.ts --port 80 --host 0.0.0.0
