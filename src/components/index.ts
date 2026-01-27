/**
 * Component exports
 */

export { default as TranscriptionPanel } from './TranscriptionPanel';
export { default as TranscriptionSettings } from './TranscriptionSettings';
export { default as AudioUploader } from './AudioUploader';
export { default as TranscriptToWhiteboardModal } from './TranscriptToWhiteboardModal';
export { default as MeetingSummaryPanel } from './MeetingSummaryPanel';
export { default as FollowUpEmailModal } from './FollowUpEmailModal';

// Collaboration components
export { CollaborationOverlay, EditIndicator, SelectionRing } from './CollaborationOverlay';
export { UserPresenceList } from './UserPresenceList';

// Presentation components
export { default as PresentationMode } from './PresentationMode';
export { default as PresentationControls } from './PresentationControls';
export { default as SlideOrderPanel } from './SlideOrderPanel';
export { default as PresenterView } from './PresenterView';

// Template components
export { default as TemplateLibraryModal } from './TemplateLibraryModal';
export { default as TemplateCard, TemplateThumbnail } from './TemplateCard';

// Client Portal components
export { default as ShareBoardModal } from './ShareBoardModal';
export { default as ClientCommentPin } from './ClientCommentPin';
export { default as ClientCommentsPanel } from './ClientCommentsPanel';

// Enhanced collaboration components
export { default as ParticipantsPanel } from './ParticipantsPanel';
export type { ParticipantActivity } from './ParticipantsPanel';

// Unified workspace panel
export { default as UnifiedLeftPanel } from './UnifiedLeftPanel';
export type { ParticipantActivity as UnifiedPanelActivity } from './UnifiedLeftPanel';

// Authentication components
export { default as ProtectedRoute } from './ProtectedRoute';
export { AuthProvider } from './AuthProvider';

// Canvas components
export { default as SmoothCanvas } from './SmoothCanvas';
export type { SmoothCanvasRef, SmoothCanvasProps } from './SmoothCanvas';

// Enterprise Canvas Components
export { default as EnterpriseCanvas } from './EnterpriseCanvas';
export type { EnterpriseCanvasRef } from './EnterpriseCanvas';
export { default as EnhancedConnector } from './EnhancedConnector';
export { default as EnterpriseToolbar } from './EnterpriseToolbar';
export type { ToolType, ShapeType } from './EnterpriseToolbar';
export { default as EnterpriseMeetingView } from './EnterpriseMeetingView';
export { default as MobileToolbar } from './MobileToolbar';
export { default as FloatingPropertyPanel } from './FloatingPropertyPanel';

// Facilitator Tools
export { default as FacilitatorTools } from './FacilitatorTools';
export type { FacilitatorToolsProps, TimerState, FacilitatorBroadcast } from './FacilitatorTools';

// Asset Library
export { default as AssetLibrary } from './AssetLibrary';
export type { AssetLibraryProps, AssetInsertPayload } from './AssetLibrary';

// PDF Editor Components
export { default as PDFEditor } from './PDFEditor';
export type { PDFEditorProps } from './PDFEditor';
export { default as PDFToolbar } from './PDFToolbar';
export { default as PDFThumbnails } from './PDFThumbnails';
export { default as PDFAnnotationLayer } from './PDFAnnotationLayer';
export { default as DocumentsView } from './DocumentsView';
export type { ClientDocument } from './DocumentsView';

// Document Portal (SharePoint-like)
export { default as DocumentPortal } from './DocumentPortal';
export type { 
  Folder as DocumentFolder, 
  ActivityItem as DocumentActivity, 
  DocumentVersion, 
  DocumentPortalProps 
} from './DocumentPortal';

// E-Signature Workflow Components
export { 
  SignatureRequestModal, 
  SignerView, 
  SignatureStatusPanel 
} from './SignatureWorkflow';
export type { 
  SignatureField, 
  Signer, 
  SignatureRequest, 
  AuditLogEntry 
} from './SignatureWorkflow';

// Signature Pad
export { SignaturePad } from './SignaturePad';

// Upload Progress
export { UploadProgress, DragDropZone } from './UploadProgress';
export type { UploadFile } from './UploadProgress';

// Office Editor (Word, Excel, PowerPoint) - Legacy
export { OfficeEditor, QuickOfficeViewer, detectDocumentType } from './OfficeEditor';
export type { OfficeDocument, OfficeDocumentType, OfficeEditorProps } from './OfficeEditor';

// Office Viewer - New comprehensive viewer for Office documents
export { default as OfficeViewer } from './OfficeViewer';
export type { 
  OfficeViewerProps, 
  ViewerMode, 
  EditMode 
} from './OfficeViewer';

// Office Document Modal - Modal wrapper for OfficeViewer
export { OfficeDocumentModal, useOfficeDocumentModal } from './OfficeDocumentModal';
export type { OfficeDocumentModalProps } from './OfficeDocumentModal';
