CREATE TABLE "comunicados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"stable" jsonb NOT NULL,
	"delta" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encargos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approved_by_member_id" uuid,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_links" ALTER COLUMN "referral_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "action_links" ADD COLUMN "comunicado_id" uuid;--> statement-breakpoint
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comunicado_unique" ON "comunicados" USING btree ("company_id","week_start");