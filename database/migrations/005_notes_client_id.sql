-- Migration: Add client_id to notes tables
-- This allows notes to be associated with specific clients

-- Add client_id column to notes table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notes') THEN
    ALTER TABLE public.notes 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_notes_client_id ON public.notes(client_id);
  END IF;
END $$;

-- Add client_id column to project_notes table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_notes') THEN
    ALTER TABLE public.project_notes 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_project_notes_client_id ON public.project_notes(client_id);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.notes.client_id IS 'Optional reference to the client this note belongs to';
COMMENT ON COLUMN public.project_notes.client_id IS 'Optional reference to the client this note belongs to';
