CREATE TABLE "value_trials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"specialty_code" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"report_generated_at" timestamp with time zone,
	"report" jsonb,
	"started_by" uuid,
	CONSTRAINT "value_trials_candidacy_id_unique" UNIQUE("candidacy_id"),
	CONSTRAINT "value_trials_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "value_trials" ADD CONSTRAINT "value_trials_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_trials" ADD CONSTRAINT "value_trials_candidacy_id_beta_requests_id_fk" FOREIGN KEY ("candidacy_id") REFERENCES "public"."beta_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_trials" ADD CONSTRAINT "value_trials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;