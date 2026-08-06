ALTER TABLE "users" ADD COLUMN "display_name" text;
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;
UPDATE "users"
SET "display_name" = split_part("email", '@', 1)
WHERE "display_name" IS NULL;
ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;
CREATE INDEX "users_tenant_id_display_name_idx" ON "users" USING btree ("tenant_id","display_name");
