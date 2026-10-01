CREATE TABLE "communiques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"stable" jsonb NOT NULL,
	"delta" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"declared" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encargos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unchanged" boolean DEFAULT true NOT NULL,
	"dna_version" integer DEFAULT 1 NOT NULL,
	"continuity_streak" integer DEFAULT 0 NOT NULL,
	"approved_by_member_id" uuid,
	"approved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"protocol_version" text DEFAULT 'ADP-0.1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gazettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"gazette" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communiques" ADD CONSTRAINT "communiques_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communiques" ADD CONSTRAINT "communiques_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gazettes" ADD CONSTRAINT "gazettes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "communique_company_week" ON "communiques" USING btree ("company_id","week_start");--> statement-breakpoint
CREATE INDEX "communique_chapter_week" ON "communiques" USING btree ("chapter_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "gazette_chapter_week" ON "gazettes" USING btree ("chapter_id","week_start");