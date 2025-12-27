ALTER TABLE "items" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('german',
           COALESCE(name, '') || ' ' ||
           COALESCE(description, '') || ' ' ||
           COALESCE(manufacturer, '') || ' ' ||
           COALESCE(model, '') || ' ' ||
           COALESCE(category, '') || ' ' ||
           COALESCE(morestuff, '')
       )) STORED;--> statement-breakpoint
CREATE INDEX "idx_content_search" ON "items" USING gin ("search_vector");