CREATE TABLE "chapter_foundings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"promoter_candidacy_id" uuid NOT NULL,
	"proposed_name" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"min_members" integer DEFAULT 12 NOT NULL,
	"reward_text" text,
	"reward_granted_at" timestamp with time zone,
	"chapter_id" uuid,
	"created_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "founding_id" uuid;--> statement-breakpoint
ALTER TABLE "chapter_foundings" ADD CONSTRAINT "chapter_foundings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;