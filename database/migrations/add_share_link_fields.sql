-- Migration: Add share link fields to board_magic_links
-- Run this if you have an existing database to add the new columns

-- Add new columns (will skip if they already exist)
DO $$
BEGIN
    -- Add client_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'client_name') THEN
        ALTER TABLE board_magic_links ADD COLUMN client_name TEXT;
    END IF;

    -- Add password_hash column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'password_hash') THEN
        ALTER TABLE board_magic_links ADD COLUMN password_hash TEXT;
    END IF;

    -- Add views column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'views') THEN
        ALTER TABLE board_magic_links ADD COLUMN views INTEGER DEFAULT 0;
    END IF;

    -- Add last_viewed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'last_viewed_at') THEN
        ALTER TABLE board_magic_links ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'is_active') THEN
        ALTER TABLE board_magic_links ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add company_branding column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'board_magic_links' AND column_name = 'company_branding') THEN
        ALTER TABLE board_magic_links ADD COLUMN company_branding JSONB DEFAULT '{}';
    END IF;
END $$;

-- Update permission check constraint to include 'comment'
ALTER TABLE board_magic_links DROP CONSTRAINT IF EXISTS board_magic_links_permission_check;
ALTER TABLE board_magic_links ADD CONSTRAINT board_magic_links_permission_check
    CHECK (permission IN ('view', 'comment', 'edit'));

-- Add index on board_id if not exists
CREATE INDEX IF NOT EXISTS idx_magic_links_board ON board_magic_links(board_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'board_magic_links'
ORDER BY ordinal_position;
