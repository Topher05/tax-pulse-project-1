CREATE TABLE "outbox_event" (
	"id" uuid DEFAULT uuidv7() NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_event_id_pk" PRIMARY KEY("id")
);
