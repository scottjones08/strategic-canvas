-- Migration: Add client_id to project_notes table
-- This allows notes to be associated with specific clients

-- Add client_id column to project_notes table
ALTER TABLE public.project_notes 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for faster client-based queries
CREATE INDEX IF NOT EXISTS idx_project_notes_client_id ON public.project_notes(client_id);

-- Add comment for documentation
COMMENT ON COLUMN public.project_notes.client_id IS 'Optional reference to the client this note belongs to';
