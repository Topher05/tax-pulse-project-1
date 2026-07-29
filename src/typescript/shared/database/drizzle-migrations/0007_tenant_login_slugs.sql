ALTER TABLE "tenants" ADD COLUMN "login_slug" text;--> statement-breakpoint
UPDATE "tenants"
SET "login_slug" = 'tenant-' || left(replace("id"::text, '-', ''), 12)
WHERE "login_slug" IS NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "login_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_login_slug_format_check" CHECK ("tenants"."login_slug" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_login_slug_key" ON "tenants" USING btree ("login_slug");
