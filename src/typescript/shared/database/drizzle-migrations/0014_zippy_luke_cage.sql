CREATE TABLE "outbox_dead_letter" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"outbox_event_id" uuid NOT NULL,
	"payload" text NOT NULL,
	"failure_reason" text NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_dead_letter_id_pk" PRIMARY KEY("id")
);
