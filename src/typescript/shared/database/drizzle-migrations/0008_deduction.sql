CREATE TYPE "public"."deduction_category" AS ENUM (
  'Business Expense',
  'Home Office',
  'Charitable Giving',
  'Health & Medical',
  'Education',
  'Retirement Contribution',
  'Other'
);--> statement-breakpoint
CREATE TABLE "deduction" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "case_id" uuid NOT NULL,
  "date" date NOT NULL,
  "description" text NOT NULL,
  "category" "public"."deduction_category" NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "tax_impact" numeric(14, 2) NOT NULL,
  "deleted" boolean DEFAULT false NOT NULL,
  CONSTRAINT "deduction_id_pk" PRIMARY KEY("id")
);--> statement-breakpoint
ALTER TABLE "deduction" ADD CONSTRAINT "deduction_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deduction_case_id_deleted_idx" ON "deduction" USING btree ("case_id","deleted");--> statement-breakpoint
CREATE INDEX "deduction_case_id_date_idx" ON "deduction" USING btree ("case_id","date");
