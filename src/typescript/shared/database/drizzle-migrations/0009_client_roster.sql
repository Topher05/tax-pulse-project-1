CREATE TABLE "client_roster" (
	"id" uuid DEFAULT uuidv7() PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"filing_status" text NOT NULL,
	"ytd_income" numeric(14, 2) NOT NULL,
	"estimated_tax" numeric(14, 2) NOT NULL,
	"quarterly_status" text
);
--> statement-breakpoint
ALTER TABLE "client_roster" ADD CONSTRAINT "client_roster_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_roster" ADD CONSTRAINT "client_roster_ytd_income_nonnegative_check" CHECK ("client_roster"."ytd_income" >= 0);
--> statement-breakpoint
ALTER TABLE "client_roster" ADD CONSTRAINT "client_roster_estimated_tax_nonnegative_check" CHECK ("client_roster"."estimated_tax" >= 0);
--> statement-breakpoint
CREATE INDEX "client_roster_tenant_id_client_name_idx" ON "client_roster" USING btree ("tenant_id", "client_name");
