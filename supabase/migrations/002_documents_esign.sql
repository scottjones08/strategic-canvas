-- Documents and E-Signature Schema
-- Extends strategic-canvas with document management and e-signature capabilities

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE document_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE signature_request_status AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'declined', 'expired', 'voided');
CREATE TYPE signer_status AS ENUM ('pending', 'sent', 'viewed', 'signed', 'declined');
CREATE TYPE signature_field_type AS ENUM ('signature', 'initials', 'date', 'text', 'checkbox');
CREATE TYPE saved_signature_type AS ENUM ('signature', 'initials');

-- ============================================================================
-- DOCUMENT FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CLIENT DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  
  -- File info
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_key TEXT, -- Storage bucket key
  file_size BIGINT,
  file_type TEXT, -- MIME type
  page_count INTEGER,
  thumbnail_url TEXT,
  
  -- Annotations and comments (JSONB for flexibility)
  annotations JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  
  -- Sharing
  share_token TEXT UNIQUE,
  share_permissions JSONB DEFAULT '{"view": true, "download": false, "comment": false}'::jsonb,
  share_expires_at TIMESTAMPTZ,
  
  -- Status and versioning
  status document_status DEFAULT 'active',
  version INTEGER DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  last_viewed_at TIMESTAMPTZ
);

-- ============================================================================
-- SIGNATURE REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  
  title TEXT NOT NULL,
  message TEXT,
  status signature_request_status DEFAULT 'draft',
  
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_file_url TEXT, -- Final signed PDF
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SIGNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  "order" INTEGER DEFAULT 1, -- Signing order
  status signer_status DEFAULT 'pending',
  
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  last_viewed_at TIMESTAMPTZ,
  last_reminder_at TIMESTAMPTZ
);

-- ============================================================================
-- SIGNATURE FIELDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signer_id UUID REFERENCES signers(id) ON DELETE CASCADE NOT NULL,
  
  page_number INTEGER NOT NULL DEFAULT 1,
  type signature_field_type NOT NULL DEFAULT 'signature',
  
  -- Position (relative 0-1 coordinates for responsive rendering)
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 0.2,
  height FLOAT NOT NULL DEFAULT 0.05,
  
  required BOOLEAN DEFAULT TRUE,
  placeholder TEXT,
  value TEXT, -- Filled value
  signed_at TIMESTAMPTZ
);

-- ============================================================================
-- SIGNATURE AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE NOT NULL,
  
  action TEXT NOT NULL, -- e.g., 'created', 'sent', 'viewed', 'signed', 'declined', 'voided'
  actor TEXT, -- User ID or 'system'
  actor_name TEXT,
  
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAVED SIGNATURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  type saved_signature_type NOT NULL DEFAULT 'signature',
  name TEXT DEFAULT 'My Signature',
  image_data TEXT NOT NULL, -- Base64 encoded image
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Document folders
CREATE INDEX IF NOT EXISTS idx_document_folders_org ON document_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_client ON document_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);

-- Client documents
CREATE INDEX IF NOT EXISTS idx_client_documents_org ON client_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_folder ON client_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_share_token ON client_documents(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_documents_created_by ON client_documents(created_by);

-- Signature requests
CREATE INDEX IF NOT EXISTS idx_signature_requests_document ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_client ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_by ON signature_requests(created_by);

-- Signers
CREATE INDEX IF NOT EXISTS idx_signers_request ON signers(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signers_email ON signers(email);
CREATE INDEX IF NOT EXISTS idx_signers_access_token ON signers(access_token);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);

-- Signature fields
CREATE INDEX IF NOT EXISTS idx_signature_fields_signer ON signature_fields(signer_id);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_request ON signature_audit_log(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_created ON signature_audit_log(created_at);

-- Saved signatures
CREATE INDEX IF NOT EXISTS idx_saved_signatures_user ON saved_signatures(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_signatures ENABLE ROW LEVEL SECURITY;

-- Document folders policies (permissive for now)
CREATE POLICY "document_folders_all" ON document_folders
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Client documents policies (permissive for now)
CREATE POLICY "client_documents_all" ON client_documents
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Signature requests policies (permissive for now)
CREATE POLICY "signature_requests_all" ON signature_requests
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Signers policies (permissive for now)
CREATE POLICY "signers_all" ON signers
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Signature fields policies (permissive for now)
CREATE POLICY "signature_fields_all" ON signature_fields
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Signature audit log policies (permissive for now)
CREATE POLICY "signature_audit_log_all" ON signature_audit_log
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Saved signatures policies (permissive for now)
CREATE POLICY "saved_signatures_all" ON saved_signatures
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
DROP TRIGGER IF EXISTS document_folders_updated_at ON document_folders;
CREATE TRIGGER document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS client_documents_updated_at ON client_documents;
CREATE TRIGGER client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS signature_requests_updated_at ON signature_requests;
CREATE TRIGGER signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable realtime for collaborative/interactive features
ALTER PUBLICATION supabase_realtime ADD TABLE client_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE signature_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE signers;
ALTER PUBLICATION supabase_realtime ADD TABLE signature_audit_log;
