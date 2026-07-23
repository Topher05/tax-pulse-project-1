CREATE TABLE "audit_entry" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_entry_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "audit_entry" ADD CONSTRAINT "audit_entry_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entry_case_id_occurred_at_idx" ON "audit_entry" USING btree ("case_id","occurred_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_entry_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_entry is append-only and cannot be updated or deleted';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_entry_block_update_delete
BEFORE UPDATE OR DELETE ON audit_entry
FOR EACH ROW
EXECUTE FUNCTION audit_entry_prevent_mutation();
