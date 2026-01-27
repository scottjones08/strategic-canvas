-- Documents Migration for PDF Editor Feature
-- Run this in your Supabase SQL Editor

-- ============================================
-- CLIENT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID, -- Links to organizations (clients)
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size BIGINT, -- Size in bytes
    file_type VARCHAR(100) DEFAULT 'application/pdf',
    page_count INTEGER DEFAULT 1,
    
    -- Annotations stored as JSONB (highlights, drawings, notes, etc.)
    annotations JSONB DEFAULT '[]',
    
    -- Form data if PDF has fillable fields
    form_data JSONB DEFAULT '{}',
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    share_password_hash VARCHAR(255),
    share_expires_at TIMESTAMP WITH TIME ZONE,
    share_permissions VARCHAR(50) DEFAULT 'view' CHECK (share_permissions IN ('view', 'comment', 'edit')),
    
    -- Metadata
    thumbnail_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    version INTEGER DEFAULT 1,
    
    -- Ownership
    owner_id UUID,
    created_by UUID,
    last_modified_by UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Full-text search
    search_vector tsvector
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_organization ON client_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_share_token ON client_documents(share_token);
CREATE INDEX IF NOT EXISTS idx_client_documents_search ON client_documents USING GIN(search_vector);

-- ============================================
-- DOCUMENT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE,
    
    -- Position in the document
    page_number INTEGER NOT NULL,
    position_x DECIMAL(10, 2), -- Percentage position
    position_y DECIMAL(10, 2),
    
    -- Highlighted text region (if applicable)
    selection_start INTEGER,
    selection_end INTEGER,
    selected_text TEXT,
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- Author info
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    author_id UUID, -- If logged in user
    
    -- Thread/reply structure
    parent_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    thread_id UUID, -- Groups all comments in a thread
    
    -- Resolution status
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Reactions
    reactions JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_page ON document_comments(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_document_comments_thread ON document_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent ON document_comments(parent_id);

-- ============================================
-- DOCUMENT ANNOTATIONS TABLE
-- Stores individual annotations for real-time sync
-- ============================================
CREATE TABLE IF NOT EXISTS document_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE,
    
    -- Annotation type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'highlight', 'underline', 'strikethrough', 
        'rectangle', 'ellipse', 'arrow', 'line',
        'freehand', 'text', 'sticky_note',
        'signature', 'stamp', 'image'
    )),
    
    -- Position and size
    page_number INTEGER NOT NULL,
    x DECIMAL(10, 4) NOT NULL, -- Percentage of page width
    y DECIMAL(10, 4) NOT NULL, -- Percentage of page height
    width DECIMAL(10, 4),
    height DECIMAL(10, 4),
    
    -- Style properties
    color VARCHAR(20) DEFAULT '#ffff00',
    opacity DECIMAL(3, 2) DEFAULT 1.0,
    stroke_width INTEGER DEFAULT 2,
    font_size INTEGER,
    font_family VARCHAR(100),
    
    -- Content (for text/notes/stamps)
    content TEXT,
    
    -- For freehand drawing
    path_data JSONB, -- Array of points
    
    -- For signatures/images
    image_data TEXT, -- Base64 or URL
    
    -- For text selection based annotations
    text_quads JSONB, -- Array of quad coordinates for multi-line selections
    
    -- Author
    author_id UUID,
    author_name VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_annotations_document ON document_annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_annotations_page ON document_annotations(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_document_annotations_type ON document_annotations(type);

-- ============================================
-- DOCUMENT VERSION HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    change_summary TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- ============================================
-- DOCUMENT SHARE LINKS
-- Similar to board_magic_links but for documents
-- ============================================
CREATE TABLE IF NOT EXISTS document_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
    client_name VARCHAR(255),
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Branding for client portal
    company_branding JSONB DEFAULT '{}',
    
    -- Track access
    views INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_magic_links_token ON document_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_document_magic_links_document ON document_magic_links(document_id);

-- ============================================
-- UPDATE CLIENT WORKSPACE SETTINGS
-- Add documents_enabled column if client_workspace table exists
-- ============================================
-- Note: Run this only if you have a client_workspace table
-- ALTER TABLE client_workspace ADD COLUMN IF NOT EXISTS documents_enabled BOOLEAN DEFAULT TRUE;

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- Run this in Supabase Dashboard > Storage
-- ============================================
-- Create bucket named 'documents' with the following settings:
-- - Public: false
-- - File size limit: 50MB
-- - Allowed MIME types: application/pdf, image/png, image/jpeg

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE client_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE document_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE document_annotations;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_magic_links ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (adjust for production)
CREATE POLICY "Allow all on client_documents" ON client_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_comments" ON document_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_annotations" ON document_annotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_versions" ON document_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_magic_links" ON document_magic_links FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update search vector on document insert/update
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
DROP TRIGGER IF EXISTS trigger_update_document_search ON client_documents;
CREATE TRIGGER trigger_update_document_search
    BEFORE INSERT OR UPDATE ON client_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_document_updated_at ON client_documents;
CREATE TRIGGER trigger_document_updated_at
    BEFORE UPDATE ON client_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_updated_at();

DROP TRIGGER IF EXISTS trigger_comment_updated_at ON document_comments;
CREATE TRIGGER trigger_comment_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_document_updated_at();

DROP TRIGGER IF EXISTS trigger_annotation_updated_at ON document_annotations;
CREATE TRIGGER trigger_annotation_updated_at
    BEFORE UPDATE ON document_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_document_updated_at();
