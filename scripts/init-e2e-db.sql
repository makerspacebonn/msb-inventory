-- E2E Database Initialization Script
-- This script runs when the PostgreSQL container starts

-- Enable required extensions for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
