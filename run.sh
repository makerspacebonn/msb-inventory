#!/bin/bash
bun db:migrate && bun run build && bun --bun vite preview --port 80 --host 0.0.0.0