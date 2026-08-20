CREATE TABLE "credential" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"passwordHash" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_enrollment" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"totpSecret" varchar(512) NOT NULL,
	"isEnrolled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_enrollment" ADD CONSTRAINT "mfa_enrollment_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credential_userId_key" ON "credential" USING btree ("userId");