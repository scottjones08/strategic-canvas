// Board and VisualNode type definitions for Strategic Canvas

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
}

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
  connectorFrom?: string;
  connectorTo?: string;
  connectorStyle?: 'solid' | 'dashed' | 'dotted';
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
