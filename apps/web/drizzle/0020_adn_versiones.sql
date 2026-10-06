CREATE TABLE "business_dna_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"dna" jsonb NOT NULL,
	"validated_by" uuid,
	"validated_at" timestamp with time zone,
	"replaced_by" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dna_version_company" ON "business_dna_versions" USING btree ("company_id","version");