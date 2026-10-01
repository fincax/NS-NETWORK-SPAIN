ALTER TABLE "referrals" ADD COLUMN "second_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "escalated_at" timestamp with time zone;