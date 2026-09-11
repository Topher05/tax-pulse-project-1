ALTER TABLE "tax_plan_cycle" ADD COLUMN "route_key" varchar(24);--> statement-breakpoint
UPDATE "tax_plan_cycle"
SET "route_key" = translate(encode(uuid_send(uuidv7()), 'base64'), '+/=', '-_')
WHERE "route_key" IS NULL;--> statement-breakpoint
ALTER TABLE "tax_plan_cycle" ALTER COLUMN "route_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tax_plan_cycle_route_key_key" ON "tax_plan_cycle" USING btree ("route_key");
