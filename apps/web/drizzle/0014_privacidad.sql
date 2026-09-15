ALTER TABLE "beta_requests" ADD COLUMN "privacy_version" text;--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "privacy_accepted_at" timestamp with time zone;