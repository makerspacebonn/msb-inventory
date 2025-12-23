#!/bin/bash
bun db:migrate && bun run server.ts --port 80 --host 0.0.0.0