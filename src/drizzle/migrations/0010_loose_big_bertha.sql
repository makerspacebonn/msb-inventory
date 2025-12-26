ALTER TABLE "items" ADD COLUMN "tags" varchar[];--> statement-breakpoint
CREATE INDEX "items_tags_idx" ON "items" USING gin ("tags");