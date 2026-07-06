CREATE TABLE "stage_transition" (
	"case_id" uuid NOT NULL,
	"from_stage" text NOT NULL,
	"to_stage" text NOT NULL,
	"actor" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "stage_transition_from_stage_check" CHECK ("stage_transition"."from_stage" IN ('Intake', 'Data Aggregation', 'Modeling', 'Review', 'Client Approval', 'Executed', 'Archived')),
	CONSTRAINT "stage_transition_to_stage_check" CHECK ("stage_transition"."to_stage" IN ('Intake', 'Data Aggregation', 'Modeling', 'Review', 'Client Approval', 'Executed', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "tax_plan_cycle" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"client_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"planning_period" text NOT NULL,
	"stage" text NOT NULL,
	"owner" text NOT NULL,
	"priority" text NOT NULL,
	"due_date" date NOT NULL,
	"on_hold" boolean DEFAULT false NOT NULL,
	"hold_reason" text,
	CONSTRAINT "tax_plan_cycle_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "tax_plan_cycle_stage_check" CHECK ("tax_plan_cycle"."stage" IN ('Intake', 'Data Aggregation', 'Modeling', 'Review', 'Client Approval', 'Executed', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stage_transition" ADD CONSTRAINT "stage_transition_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_plan_cycle" ADD CONSTRAINT "tax_plan_cycle_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stage_transition_case_id_idx" ON "stage_transition" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "tax_plan_cycle_tenant_id_due_date_idx" ON "tax_plan_cycle" USING btree ("tenant_id","due_date");
