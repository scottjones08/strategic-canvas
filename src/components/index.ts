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

// Canvas components
export { default as SmoothCanvas } from './SmoothCanvas';
export type { SmoothCanvasRef, SmoothCanvasProps } from './SmoothCanvas';
