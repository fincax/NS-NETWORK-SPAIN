ALTER TABLE "referrals" ADD COLUMN "contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "contact_reminder_sent_at" timestamp with time zone;