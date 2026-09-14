ALTER TABLE "companies" ADD COLUMN "compromiso_weeks_without" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "compromiso_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "compromiso_checked_week" text;