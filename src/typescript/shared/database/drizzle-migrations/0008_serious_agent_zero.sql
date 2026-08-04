CREATE TABLE "action_item" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"description" text NOT NULL,
	"deadline" date NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "action_item_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "action_item" ADD CONSTRAINT "action_item_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_item_case_id_idx" ON "action_item" USING btree ("case_id");