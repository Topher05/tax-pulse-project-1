CREATE TABLE "taxpayer_identifier_validation" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tin_type" text NOT NULL,
	"validation_result" text NOT NULL,
	"verified_name" text,
	"provider" text DEFAULT 'tivs' NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxpayer_identifier_validation_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "taxpayer_identifier_validation_tin_type_check" CHECK ("taxpayer_identifier_validation"."tin_type" IN ('ein', 'ssn')),
	CONSTRAINT "taxpayer_identifier_validation_result_check" CHECK ("taxpayer_identifier_validation"."validation_result" IN ('match', 'tin_not_issued', 'tin_not_found', 'name_mismatch'))
);
--> statement-breakpoint
ALTER TABLE "taxpayer_identifier_validation" ADD CONSTRAINT "taxpayer_identifier_validation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_identifier_validation" ADD CONSTRAINT "taxpayer_identifier_validation_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "taxpayer_identifier_validation_case_id_key" ON "taxpayer_identifier_validation" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "taxpayer_identifier_validation_tenant_case_idx" ON "taxpayer_identifier_validation" USING btree ("tenant_id","case_id");