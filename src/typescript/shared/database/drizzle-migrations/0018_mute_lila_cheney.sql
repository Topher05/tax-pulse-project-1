CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "ai_assist_corpus_embedding" (
	"chunk_id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"document_type" text NOT NULL,
	"section_id" text NOT NULL,
	"section_path" text NOT NULL,
	"text" text NOT NULL,
	"content_hash" text NOT NULL,
	"ordinal" integer NOT NULL,
	"citation" jsonb NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_assist_corpus_embedding_embedding_hnsw_idx" ON "ai_assist_corpus_embedding" USING hnsw ("embedding" vector_cosine_ops);
