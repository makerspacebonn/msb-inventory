-- Baseline of the schema as of 0.3.0, replacing the earlier migrations
-- (they could no longer build a database from scratch; see git history).
-- pg_trgm is needed for the gin_trgm_ops index on items.searchable_text
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" varchar,
	"id_token" text,
	"password" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "changelog" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" integer NOT NULL,
	"change_type" varchar(20) NOT NULL,
	"user_id" varchar,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"before_values" json,
	"after_values" json,
	"changed_fields" varchar[],
	"group_id" varchar
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"location_id" integer,
	"parentLocationMarker" json,
	"image_path" varchar,
	"extra_image_paths" varchar[] DEFAULT '{}'::varchar[] NOT NULL,
	"additionalInfo" json,
	"tags" varchar[],
	"manufacturer" varchar,
	"model" varchar,
	"category" varchar,
	"links" json,
	"morestuff" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('german',
           COALESCE(name, '') || ' ' ||
           COALESCE(description, '') || ' ' ||
           COALESCE(manufacturer, '') || ' ' ||
           COALESCE(model, '') || ' ' ||
           COALESCE(category, '') || ' ' ||
           COALESCE(morestuff, '')
       )) STORED,
	"searchable_text" text GENERATED ALWAYS AS (COALESCE(name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(manufacturer, '') || ' ' ||
            COALESCE(model, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(morestuff, '')) STORED
);
--> statement-breakpoint
CREATE TABLE "item_views" (
	"item_id" integer NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "item_views_item_id_day_pk" PRIMARY KEY("item_id","day")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"description" text,
	"parent_id" integer,
	"parentLocationMarker" json,
	"image_path" varchar,
	"additionalInfo" json
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"name" varchar PRIMARY KEY NOT NULL,
	"done_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_counts" (
	"day" date PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar,
	"user_agent" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"impersonated_by" varchar,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar,
	"email" varchar,
	"email_verified" boolean DEFAULT false,
	"image" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" varchar DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" varchar,
	"ban_expires" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" varchar PRIMARY KEY NOT NULL,
	"identifier" varchar NOT NULL,
	"value" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_views" ADD CONSTRAINT "item_views_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_changelog_entity" ON "changelog" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_changelog_group" ON "changelog" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_changelog_changed_at" ON "changelog" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_content_search" ON "items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_searchable_text" ON "items" USING gin ("searchable_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "items_tags_idx" ON "items" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_item_views_day" ON "item_views" USING btree ("day");