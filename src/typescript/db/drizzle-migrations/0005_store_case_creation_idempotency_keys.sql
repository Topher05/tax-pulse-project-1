CREATE TABLE "tax_plan_cycle_idempotency_key" (
	"tenant_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"case_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tax_plan_cycle_idempotency_key" ADD CONSTRAINT "tax_plan_cycle_idempotency_key_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_plan_cycle_idempotency_key" ADD CONSTRAINT "tax_plan_cycle_idempotency_key_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tax_plan_cycle_idempotency_key_tenant_key_idx" ON "tax_plan_cycle_idempotency_key" USING btree ("tenant_id","idempotency_key");
