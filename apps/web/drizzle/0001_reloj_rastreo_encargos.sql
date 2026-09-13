CREATE TABLE "demands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"text" text NOT NULL,
	"trigger" text,
	"industry" text,
	"value_band" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"active_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"company_name" text,
	"city" text,
	"url" text,
	"published_at" timestamp with time zone,
	"ingested_by_company_id" uuid,
	"opportunity_signal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "late_flagged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "last_nudge_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_records" ADD CONSTRAINT "public_records_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_records" ADD CONSTRAINT "public_records_ingested_by_company_id_companies_id_fk" FOREIGN KEY ("ingested_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_records" ADD CONSTRAINT "public_records_opportunity_signal_id_opportunity_signals_id_fk" FOREIGN KEY ("opportunity_signal_id") REFERENCES "public"."opportunity_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demand_chapter_status" ON "demands" USING btree ("chapter_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "public_record_ref" ON "public_records" USING btree ("chapter_id","external_ref");