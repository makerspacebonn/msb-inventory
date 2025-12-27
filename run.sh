#!/bin/bash
bun db:push && bun run server.ts --port 80 --host 0.0.0.0