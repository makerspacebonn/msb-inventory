ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "discord_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "uuid1" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "discord_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "refresh_token";