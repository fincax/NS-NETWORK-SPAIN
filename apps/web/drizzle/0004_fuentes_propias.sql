CREATE TABLE "agent_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"kind" text DEFAULT 'FEED' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_status" text,
	"created_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_sources" ADD CONSTRAINT "agent_sources_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sources" ADD CONSTRAINT "agent_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;