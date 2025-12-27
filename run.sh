#!/bin/bash
bun db:push --force && bun run server.ts --port 80 --host 0.0.0.0