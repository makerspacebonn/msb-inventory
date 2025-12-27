ALTER TABLE items
    ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('german',
                        COALESCE(name, '') || ' ' ||
                        COALESCE(description, '') || ' ' ||
                        COALESCE(manufacturer, '') || ' ' ||
                        COALESCE(model, '') || ' ' ||
                        COALESCE(category, '') || ' ' ||
                        COALESCE(morestuff, '')
            )
            ) STORED;


CREATE INDEX idx_items_search_vector ON items USING GIN (search_vector);


-- Enable the extension if you haven't already
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a helper column for the raw text to index it
ALTER TABLE items
    ADD COLUMN searchable_text text
        GENERATED ALWAYS AS (
            COALESCE(name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(manufacturer, '') || ' ' ||
            COALESCE(model, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(morestuff, '')
            ) STORED;

-- Index the text for similarity and LIKE searches
CREATE INDEX idx_items_trgm ON items USING GIN (searchable_text gin_trgm_ops);
