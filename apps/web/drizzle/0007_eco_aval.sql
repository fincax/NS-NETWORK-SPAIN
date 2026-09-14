CREATE TABLE "endorsements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"phase" text,
	"attention" integer,
	"result" integer,
	"recommend" integer,
	"comment" text,
	"public_consent" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_message" text,
	"sent_at" timestamp with time zone,
	"sent_by_member_id" uuid,
	"submitted_at" timestamp with time zone,
	"publicity_withdrawn_at" timestamp with time zone,
	"nudge_sent_at" timestamp with time zone,
	"missed_flagged_at" timestamp with time zone,
	"follow_up_sent_at" timestamp with time zone,
	"window_closed_at" timestamp with time zone,
	"contrast_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "endorsements_referral_id_unique" UNIQUE("referral_id"),
	CONSTRAINT "endorsements_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "protocol_version" SET DEFAULT '0.3';--> statement-breakpoint
ALTER TABLE "opportunity_signals" ALTER COLUMN "protocol_version" SET DEFAULT '0.3';--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "protocol_version" SET DEFAULT '0.3';--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "aval" integer;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "aval_status" text;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "endorsement_chapter_status" ON "endorsements" USING btree ("chapter_id","status");