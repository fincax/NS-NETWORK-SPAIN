CREATE TABLE "contribution_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"distinct_specialties" integer DEFAULT 0 NOT NULL,
	"missed_streak" integer DEFAULT 0 NOT NULL,
	"action" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contribution_weeks" ADD CONSTRAINT "contribution_weeks_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_weeks" ADD CONSTRAINT "contribution_weeks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_week_unique" ON "contribution_weeks" USING btree ("company_id","week_start");--> statement-breakpoint
CREATE INDEX "contribution_chapter_week" ON "contribution_weeks" USING btree ("chapter_id","week_start");