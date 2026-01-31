// Board and VisualNode type definitions for Fan Canvas

// Voting settings for the board
export interface VotingSettings {
  enabled: boolean;
  anonymous: boolean;
  maxVotesPerPerson: number | 'unlimited';
  hideCountsUntilReveal: boolean;
  isRevealed: boolean;
  isLocked: boolean;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  visualNodes: VisualNode[];
  createdAt: Date;
  zoom: number;
  panX: number;
  panY: number;
  status?: 'active' | 'completed' | 'archived';
  progress?: number;
  lastActivity?: Date;
  participants?: number;
  transcripts?: SavedTranscript[];
  uploadBucketId?: string;
  clientId?: string;
  linkedNoteIds?: string[];
  // Infinite canvas bounds
  canvasBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  // Grid settings
  gridSettings?: {
    enabled: boolean;
    size: number;
    snap: boolean;
    showDots: boolean;
  };
  // Voting settings
  votingSettings?: VotingSettings;
}

// Waypoint for connector routing
export interface Waypoint {
  x: number;
  y: number;
  id: string;
  type: 'start' | 'end' | 'control';
}

// Connector routing style
export type ConnectorRoutingStyle = 'straight' | 'curved' | 'orthogonal' | 'stepped';

export interface VisualNode {
  id: string;
  type: 'sticky' | 'frame' | 'opportunity' | 'risk' | 'action' | 'youtube' | 'image' | 'bucket' | 'text' | 'shape' | 'connector' | 'mindmap' | 'drawing' | 'comment' | 'table' | 'linklist';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  rotation: number;
  locked: boolean;
  votes: number;
  votedBy: string[];
  createdBy: string;
  comments: { id: string; userId: string; content: string; timestamp: Date }[];
  meetingTimestamp?: number;
  mediaUrl?: string;
  bucketId?: string;
  bucketImages?: string[];
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'diamond';
  textStyle?: 'heading' | 'paragraph' | 'body';
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  // Enhanced connector properties
  connectorFrom?: string;
  connectorTo?: string;
  connectorFromEdge?: 'top' | 'right' | 'bottom' | 'left';
  connectorToEdge?: 'top' | 'right' | 'bottom' | 'left';
  connectorStyle?: 'solid' | 'dashed' | 'dotted';
  connectorLabel?: string;
  connectorWaypoints?: Waypoint[];
  connectorRouting?: ConnectorRoutingStyle;
  connectorArrowStart?: boolean;
  connectorArrowEnd?: boolean;
  // Legacy control point (for backwards compatibility)
  connectorControlPoint?: { x: number; y: number };
  groupId?: string;
  zIndex?: number;
  // Mind map properties
  parentNodeId?: string;
  isRootNode?: boolean;
  mindmapId?: string;
  // Drawing properties
  paths?: { points: { x: number; y: number }[]; color: string; width: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  // Reactions
  reactions?: { emoji: string; userIds: string[] }[];
  // Table properties
  tableData?: { rows: string[][]; headers?: string[] };
  // Link list properties
  links?: { id: string; title: string; url: string; description?: string }[];
  // Text formatting
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  // Visual properties
  opacity?: number;
  // Animation
  animation?: {
    type: 'fade' | 'slide' | 'scale' | 'bounce';
    delay?: number;
    duration?: number;
  };
}

export interface SavedTranscript {
  id: string;
  entries: TranscriptEntry[];
  startedAt: Date;
  endedAt: Date;
  duration: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}
