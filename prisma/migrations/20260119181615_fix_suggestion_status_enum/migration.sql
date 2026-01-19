-- Create SuggestionStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
