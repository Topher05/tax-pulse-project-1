CREATE TABLE "scenario" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"name" text NOT NULL,
	"typed_figures" jsonb NOT NULL,
	"computed_result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenario_id_pk" PRIMARY KEY("id")
);
ALTER TABLE "scenario" ADD CONSTRAINT "scenario_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_case_id_name_key" ON "scenario" USING btree ("case_id","name");--> statement-breakpoint
CREATE INDEX "scenario_case_id_idx" ON "scenario" USING btree ("case_id");
