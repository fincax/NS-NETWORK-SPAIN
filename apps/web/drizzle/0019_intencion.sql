CREATE TABLE "agent_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"text" text NOT NULL,
	"proposal" jsonb NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"result" jsonb,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_intents" ADD CONSTRAINT "agent_intents_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_intents" ADD CONSTRAINT "agent_intents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_intents" ADD CONSTRAINT "agent_intents_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_intent_company" ON "agent_intents" USING btree ("company_id","created_at");