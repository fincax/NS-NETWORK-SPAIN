ALTER TABLE "beta_requests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beta_requests" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;