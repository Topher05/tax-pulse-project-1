ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;--> statement-breakpoint
UPDATE "users"
SET "display_name" = split_part("email", '@', 1)
WHERE "display_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
