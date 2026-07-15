CREATE TABLE "refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_token_user_id_expires_at_idx" ON "refresh_token" USING btree ("user_id","expires_at");