CREATE TYPE "public"."income_event_type" AS ENUM('w2', '1099', 'capital-gains', 'rental', 'other');--> statement-breakpoint
CREATE TABLE "income_event" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"type" "income_event_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"withholding" numeric(14, 2) NOT NULL,
	CONSTRAINT "income_event_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "income_event_source_nonempty_check" CHECK (length(btrim("income_event"."source")) > 0),
	CONSTRAINT "income_event_amount_nonnegative_check" CHECK ("income_event"."amount" >= 0),
	CONSTRAINT "income_event_withholding_nonnegative_check" CHECK ("income_event"."withholding" >= 0)
);
--> statement-breakpoint
ALTER TABLE "income_event" ADD CONSTRAINT "income_event_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "income_event_case_id_date_idx" ON "income_event" USING btree ("case_id","date");