CREATE TABLE "tax_plan_cycle_comment" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" "user_role_name" NOT NULL,
	"author_display_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_plan_cycle_comment_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "tax_plan_cycle_comment_body_nonblank_check" CHECK (length(btrim("tax_plan_cycle_comment"."body")) > 0)
);
--> statement-breakpoint
ALTER TABLE "tax_plan_cycle_comment" ADD CONSTRAINT "tax_plan_cycle_comment_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tax_plan_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_plan_cycle_comment" ADD CONSTRAINT "tax_plan_cycle_comment_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_plan_cycle_comment" ADD CONSTRAINT "tax_plan_cycle_comment_actor_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_plan_cycle_comment_tenant_case_created_idx" ON "tax_plan_cycle_comment" USING btree ("tenant_id","case_id","created_at","id");