ALTER TABLE "items" ADD COLUMN "searchable_text" "tsvector" GENERATED ALWAYS AS (COALESCE(name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(manufacturer, '') || ' ' ||
            COALESCE(model, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(morestuff, '')) STORED;--> statement-breakpoint
CREATE INDEX "idx_searchable_text" ON "items" USING gin ("searchable_text" gin_trgm_ops);