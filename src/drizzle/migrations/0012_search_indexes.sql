-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for trigram search on searchable text fields
CREATE INDEX IF NOT EXISTS items_search_trgm_idx ON items
USING gin ((
  COALESCE(name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(manufacturer, '') || ' ' ||
  COALESCE(model, '') || ' ' ||
  COALESCE(category, '') || ' ' ||
  COALESCE(morestuff, '')
) gin_trgm_ops);

-- Create GIN index for fulltext search
CREATE INDEX IF NOT EXISTS items_search_fts_idx ON items
USING gin (to_tsvector('german',
  COALESCE(name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(manufacturer, '') || ' ' ||
  COALESCE(model, '') || ' ' ||
  COALESCE(category, '') || ' ' ||
  COALESCE(morestuff, '')
));

