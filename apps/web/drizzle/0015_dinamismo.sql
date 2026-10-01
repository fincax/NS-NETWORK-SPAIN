CREATE TABLE "action_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"action" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "preauthorized_scope" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "preauthorized_by_member_id" uuid;--> statement-breakpoint
ALTER TABLE "action_links" ADD CONSTRAINT "action_links_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_links_referral_idx" ON "action_links" USING btree ("referral_id");