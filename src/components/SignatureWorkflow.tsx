// SignatureWorkflow.tsx - Complete E-Signature Workflow System
// Provides signature request creation, signer view, and status tracking

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Plus,
  Send,
  FileText,
  User,
  Mail,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Trash2,
  Pen,
  Type,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  History,
  Ban,
  Link2,
  Loader2,
  Pencil,
  Hash,
  FileSignature,
} from 'lucide-react';
import SignaturePad from 'signature_pad';
import type { ClientDocument } from './DocumentsView';

// ============================================
// TYPES
// ============================================

export interface SignatureField {
  id: string;
visibleName: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox';
  pageNumber: number;
  x: number; // Percentage (0-1)
  y: number; // Percentage (0-1)
  width: number; // Percentage (0-1)
  height: number; // Percentage (0-1)
  signerId: string;
  required: boolean;
  value?: string; // Filled value (signature data URL, text, etc.)
  filledAt?: Date;
  placeholder?: string;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  order: number; // Signing order (1, 2, 3...)
  status: 'pending' | 'viewed' | 'signed' | 'declined';
  viewedAt?: Date;
  signedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  documentUrl: string;
  documentPageCount: number;
  signers: Signer[];
  fields: SignatureField[];
  message?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'voided' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  voidedAt?: Date;
  voidReason?: string;
  createdBy: string;
  accessTokens: Record<string, string>; // signerId -> token
}

export interface AuditLogEntry {
  id: string;
  requestId: string;
  action: 'created' | 'sent' | 'viewed' | 'field_filled' | 'signed' | 'declined' | 'voided' | 'completed' | 'reminder_sent' | 'downloaded';
  signerId?: string;
  signerName?: string;
  signerEmail?: string;
  fieldId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getStatusColor = (status: Signer['status']) => {
  switch (status) {
    case 'signed': return 'text-green-600 bg-green-100';
    case 'viewed': return 'text-blue-600 bg-blue-100';
    case 'declined': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getStatusIcon = (status: Signer['status']) => {
  switch (status) {
    case 'signed': return CheckCircle;
    case 'viewed': return Eye;
    case 'declined': return XCircle;
    default: return Clock;
  }
};

// ============================================
// SIGNATURE PAD MODAL COMPONENT
// ============================================

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  type: 'signature' | 'initials';
  signerName?: string;
}

const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  type,
  signerName = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [inputMode, setInputMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState('Brush Script MT');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fonts = [
    'Brush Script MT',
    'Lucida Handwriting',
    'Segoe Script',
    'Comic Sans MS',
    'Pacifico',
  ];

  useEffect(() => {
    if (isOpen && canvasRef.current && inputMode === 'draw') {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      // Resize canvas to fit container
      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext('2d')?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        signaturePadRef.current?.off();
      };
    }
  }, [isOpen, inputMode]);

  const handleClear = () => {
    if (inputMode === 'draw') {
      signaturePadRef.current?.clear();
    } else if (inputMode === 'type') {
      setTypedSignature('');
    }
  };

  const handleSave = () => {
    if (inputMode === 'draw') {
      if (signaturePadRef.current?.isEmpty()) {
        alert('Please provide a signature');
        return;
      }
      const dataUrl = signaturePadRef.current?.toDataURL('image/png');
      if (dataUrl) {
        onSave(dataUrl);
      }
    } else if (inputMode === 'type') {
      if (!typedSignature.trim()) {
        alert('Please enter your signature');
        return;
      }
      // Convert typed text to image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 400;
        canvas.height = type === 'initials' ? 80 : 120;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = `${type === 'initials' ? 40 : 48}px ${selectedFont}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(typedSignature, 20, canvas.height / 2);
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onSave(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            {type === 'initials' ? 'Add Your Initials' : 'Add Your Signature'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setInputMode('draw')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 
              ${inputMode === 'draw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Pen size={16} />
            Draw
          </button>
          <button
            onClick={() => setInputMode('type')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2
              ${inputMode === 'type' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Type size={16} />
            Type
          </button>
          <button
            onClick={() => setInputMode('upload')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2
              ${inputMode === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Upload size={16} />
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {inputMode === 'draw' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <canvas
                  ref={canvasRef}
                  className="w-full"
                  style={{ height: type === 'initials' ? 100 : 150 }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Use your mouse or finger to sign above
              </p>
            </div>
          )}

          {inputMode === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedSignature}
                onChange={e => setTypedSignature(e.target.value)}
                placeholder={type === 'initials' ? 'Enter initials...' : 'Type your name...'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontFamily: selectedFont }}
              />
              <div className="flex gap-2 flex-wrap">
                {fonts.map(font => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedFont === font 
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {type === 'initials' ? 'AB' : 'Preview'}
                  </button>
                ))}
              </div>
              {typedSignature && (
                <div 
                  className="p-4 border rounded-lg bg-white text-center text-2xl"
                  style={{ fontFamily: selectedFont }}
                >
                  {typedSignature}
                </div>
              )}
            </div>
          )}

          {inputMode === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Click to upload an image of your signature</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            <RotateCcw size={16} />
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Check size={16} />
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SIGNATURE REQUEST MODAL COMPONENT
// ============================================

interface SignatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ClientDocument[];
  onCreateRequest: (request: Omit<SignatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'accessTokens'>) => void;
}

export const SignatureRequestModal: React.FC<SignatureRequestModalProps> = ({
  isOpen,
  onClose,
  documents,
  onCreateRequest,
}) => {
  const [step, setStep] = useState<'select' | 'signers' | 'fields' | 'review'>('select');
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  const [signers, setSigners] = useState<Omit<Signer, 'status'>[]>([
    { id: generateId(), name: '', email: '', order: 1 }
  ]);
  const [fields, setFields] = useState<Omit<SignatureField, 'value' | 'filledAt'>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expirationDate, setExpirationDate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedSignerForField, setSelectedSignerForField] = useState<string | null>(null);
  const [placingFieldType, setPlacingFieldType] = useState<SignatureField['type'] | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedDocument(null);
      setSigners([{ id: generateId(), name: '', email: '', order: 1 }]);
      setFields([]);
      setCurrentPage(1);
      setExpirationDate('');
      setCustomMessage('');
      setSelectedSignerForField(null);
      setPlacingFieldType(null);
    }
  }, [isOpen]);

  const addSigner = () => {
    setSigners([
      ...signers,
      { 
        id: generateId(), 
        name: '', 
        email: '', 
        order: signers.length + 1 
      }
    ]);
  };

  const removeSigner = (id: string) => {
    if (signers.length <= 1) return;
    const updated = signers
      .filter(s => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSigners(updated);
    // Remove fields assigned to this signer
    setFields(fields.filter(f => f.signerId !== id));
  };

  const updateSigner = (id: string, updates: Partial<Signer>) => {
    setSigners(signers.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingFieldType || !selectedSignerForField || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const signer = signers.find(s => s.id === selectedSignerForField);
    
    const newField: Omit<SignatureField, 'value' | 'filledAt'> = {
      id: generateId(),
      visibleName: `${placingFieldType.charAt(0).toUpperCase() + placingFieldType.slice(1)} - ${signer?.name || 'Signer'}`,
      type: placingFieldType,
      pageNumber: currentPage,
      x: Math.max(0, Math.min(x - 0.075, 0.85)), // Center and clamp
      y: Math.max(0, Math.min(y - 0.025, 0.95)),
      width: placingFieldType === 'checkbox' ? 0.03 : placingFieldType === 'initials' ? 0.08 : 0.15,
      height: placingFieldType === 'checkbox' ? 0.03 : 0.05,
      signerId: selectedSignerForField,
      required: true,
      placeholder: placingFieldType === 'text' ? 'Enter text...' : undefined,
    };

    setFields([...fields, newField]);
    setPlacingFieldType(null);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleCreate = async () => {
    if (!selectedDocument) return;
    
    setIsCreating(true);
    
    try {
      const request: Omit<SignatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'accessTokens'> = {
        documentId: selectedDocument.id,
        documentName: selectedDocument.name,
        documentUrl: selectedDocument.fileUrl,
        documentPageCount: selectedDocument.pageCount,
        signers: signers.map(s => ({
          ...s,
          status: 'pending' as const,
        })),
        fields: fields.map(f => ({
          ...f,
          value: undefined,
          filledAt: undefined,
        })),
        message: customMessage || undefined,
        expiresAt: expirationDate ? new Date(expirationDate) : undefined,
        status: 'sent',
        createdBy: 'current-user-id', // Would come from auth context
      };

      await onCreateRequest(request);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 'select':
        return selectedDocument !== null;
      case 'signers':
        return signers.every(s => s.name.trim() && s.email.trim() && s.email.includes('@'));
      case 'fields':
        return fields.length > 0 && signers.every(s => fields.some(f => f.signerId === s.id));
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, selectedDocument, signers, fields]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-navy-700 text-white">
          <div className="flex items-center gap-3">
            <FileSignature size={24} />
            <h2 className="text-xl font-semibold">Create Signature Request</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex border-b bg-gray-50 px-6 py-3">
          {[
            { key: 'select', label: 'Select Document' },
            { key: 'signers', label: 'Add Signers' },
            { key: 'fields', label: 'Place Fields' },
            { key: 'review', label: 'Review & Send' },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg
                ${step === s.key ? 'bg-blue-100 text-blue-700' : 
                  ['select', 'signers', 'fields', 'review'].indexOf(step) > i 
                    ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s.key ? 'bg-blue-500 text-white' : 
                    ['select', 'signers', 'fields', 'review'].indexOf(step) > i
                      ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {['select', 'signers', 'fields', 'review'].indexOf(step) > i 
                    ? <Check size={14} /> : i + 1}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {i < 3 && <ChevronRight size={16} className="text-gray-400 mx-2" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Document */}
          {step === 'select' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a document to send for signature</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documents.filter(d => d.status === 'active').map(doc => (
                  <motion.div
                    key={doc.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDocument(doc)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-colors
                      ${selectedDocument?.id === doc.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="aspect-[8.5/11] bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {doc.thumbnailUrl ? (
                        <img src={doc.thumbnailUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText size={48} className="text-red-300" />
                      )}
                    </div>
                    <h4 className="font-medium text-gray-800 truncate text-sm">{doc.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{doc.pageCount} pages</p>
                  </motion.div>
                ))}
              </div>
              {documents.filter(d => d.status === 'active').length === 0 && (
                <div className="text-center py-12">
                  <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No documents available</p>
                  <p className="text-sm text-gray-400 mt-1">Upload PDF documents first</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Add Signers */}
          {step === 'signers' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Who needs to sign?</h3>
              <div className="space-y-4 max-w-2xl">
                {signers.map((signer, index) => (
                  <motion.div
                    key={signer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                          <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={signer.name}
                              onChange={e => updateSigner(signer.id, { name: e.target.value })}
                              placeholder="John Doe"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              value={signer.email}
                              onChange={e => updateSigner(signer.id, { email: e.target.value })}
                              placeholder="john@example.com"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {signers.length > 1 && (
                      <button
                        onClick={() => removeSigner(signer.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </motion.div>
                ))}

                <button
                  onClick={addSigner}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus size={16} />
                  Add another signer
                </button>

                <div className="pt-4 border-t mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Optional Settings</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Expiration Date</label>
                      <div className="relative max-w-xs">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={expirationDate}
                          onChange={e => setExpirationDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Message to signers (optional)</label>
                      <textarea
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        placeholder="Please review and sign this document at your earliest convenience."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Place Fields */}
          {step === 'fields' && selectedDocument && (
            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-72 border-r bg-gray-50 p-4 overflow-y-auto">
                <h4 className="font-semibold text-gray-800 mb-3">Place signature fields</h4>
                
                {/* Signer selector */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1">Select signer</label>
                  <select
                    value={selectedSignerForField || ''}
                    onChange={e => setSelectedSignerForField(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose signer...</option>
                    {signers.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.email}</option>
                    ))}
                  </select>
                </div>

                {/* Field types */}
                {selectedSignerForField && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Click to add, then click on document</p>
                    {[
                      { type: 'signature' as const, icon: Pencil, label: 'Signature' },
                      { type: 'initials' as const, icon: Hash, label: 'Initials' },
                      { type: 'date' as const, icon: Calendar, label: 'Date' },
                      { type: 'text' as const, icon: Type, label: 'Text Field' },
                      { type: 'checkbox' as const, icon: CheckCircle, label: 'Checkbox' },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => setPlacingFieldType(placingFieldType === type ? null : type)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${placingFieldType === type 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-gray-200 hover:border-blue-300'}`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Placed fields list */}
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Placed Fields ({fields.length})</h5>
                  <div className="space-y-2">
                    {fields.filter(f => f.pageNumber === currentPage).map(field => {
                      const signer = signers.find(s => s.id === field.signerId);
                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        >
                          <div>
                            <span className="font-medium capitalize">{field.type}</span>
                            <span className="text-gray-400 text-xs ml-2">({signer?.name?.split(' ')[0]})</span>
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PDF Preview */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                {/* Page controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {selectedDocument.pageCount}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(selectedDocument.pageCount, p + 1))}
                      disabled={currentPage === selectedDocument.pageCount}
                      className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {placingFieldType && (
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      Click on document to place {placingFieldType}
                    </div>
                  )}
                </div>

                {/* PDF Container */}
                <div className="flex-1 overflow-auto bg-gray-200 rounded-lg">
                  <div
                    ref={pdfContainerRef}
                    onClick={handlePdfClick}
                    className={`relative mx-auto bg-white shadow-lg ${placingFieldType ? 'cursor-crosshair' : ''}`}
                    style={{ width: 612, height: 792 }} // Letter size
                  >
                    {/* PDF page would render here */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <FileText size={64} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Page {currentPage}</p>
                        <p className="text-xs text-gray-400">{selectedDocument.name}</p>
                      </div>
                    </div>

                    {/* Placed fields overlay */}
                    {fields
                      .filter(f => f.pageNumber === currentPage)
                      .map(field => {
                        const signerIndex = signers.findIndex(s => s.id === field.signerId);
                        const colors = ['bg-blue-200 border-blue-400', 'bg-green-200 border-green-400', 'bg-navy-200 border-navy-400', 'bg-orange-200 border-orange-400'];
                        
                        return (
                          <div
                            key={field.id}
                            className={`absolute border-2 ${colors[signerIndex % colors.length]} rounded flex items-center justify-center text-xs font-medium group`}
                            style={{
                              left: `${field.x * 100}%`,
                              top: `${field.y * 100}%`,
                              width: `${field.width * 100}%`,
                              height: `${field.height * 100}%`,
                            }}
                          >
                            <span className="capitalize">{field.type}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && selectedDocument && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Document</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 bg-white border rounded-lg flex items-center justify-center">
                      <FileText size={32} className="text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{selectedDocument.name}</p>
                      <p className="text-sm text-gray-500">{selectedDocument.pageCount} pages</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Signers ({signers.length})</h4>
                  <div className="space-y-3">
                    {signers.map((signer, i) => (
                      <div key={signer.id} className="flex items-center gap-4 bg-white p-3 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{signer.name}</p>
                          <p className="text-sm text-gray-500">{signer.email}</p>
                        </div>
                        <div className="ml-auto text-sm text-gray-500">
                          {fields.filter(f => f.signerId === signer.id).length} fields
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Signature fields</span>
                      <span className="font-medium">{fields.filter(f => f.type === 'signature').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Initial fields</span>
                      <span className="font-medium">{fields.filter(f => f.type === 'initials').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date fields</span>
                      <span className="font-medium">{fields.filter(f => f.type === 'date').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Other fields</span>
                      <span className="font-medium">{fields.filter(f => !['signature', 'initials', 'date'].includes(f.type)).length}</span>
                    </div>
                    {expirationDate && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-500">Expires</span>
                        <span className="font-medium">{new Date(expirationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {customMessage && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-2">Message to signers</h4>
                    <p className="text-sm text-gray-600">{customMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={() => {
              const steps: typeof step[] = ['select', 'signers', 'fields', 'review'];
              const currentIndex = steps.indexOf(step);
              if (currentIndex > 0) {
                setStep(steps[currentIndex - 1]);
              }
            }}
            disabled={step === 'select'}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
          >
            Back
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            
            {step === 'review' ? (
              <button
                onClick={handleCreate}
                disabled={isCreating || !canProceed}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send for Signature
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  const steps = ['select', 'signers', 'fields', 'review'] as const;
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex < steps.length - 1) {
                    setStep(steps[currentIndex + 1]);
                  }
                }}
                disabled={!canProceed}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SIGNER VIEW COMPONENT
// ============================================

interface SignerViewProps {
  request: SignatureRequest;
  signerId: string;
  token: string;
  onFieldFill: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  onDecline: (reason: string) => void;
  onMarkViewed: () => void;
}

export const SignerView: React.FC<SignerViewProps> = ({
  request,
  signerId,
  token: _token, // Used for verification in API layer
  onFieldFill,
  onSubmit,
  onDecline,
  onMarkViewed,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [activeField, setActiveField] = useState<SignatureField | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signer = request.signers.find(s => s.id === signerId);
  const myFields = request.fields.filter(f => f.signerId === signerId);
  const filledFields = myFields.filter(f => f.value);
  const requiredFields = myFields.filter(f => f.required);
  const canSubmit = requiredFields.every(f => f.value);

  // Mark as viewed on mount
  useEffect(() => {
    if (signer?.status === 'pending') {
      onMarkViewed();
    }
  }, []);

  const handleFieldClick = (field: SignatureField) => {
    if (field.value) return; // Already filled
    
    setActiveField(field);
    
    if (field.type === 'signature' || field.type === 'initials') {
      setShowSignaturePad(true);
    } else if (field.type === 'date') {
      // Auto-fill with current date
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      onFieldFill(field.id, today);
      setActiveField(null);
    } else if (field.type === 'checkbox') {
      onFieldFill(field.id, 'checked');
      setActiveField(null);
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    if (activeField) {
      onFieldFill(activeField.id, dataUrl);
    }
    setShowSignaturePad(false);
    setActiveField(null);
  };

  const handleTextInput = (value: string) => {
    if (activeField) {
      onFieldFill(activeField.id, value);
    }
    setActiveField(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }
    onDecline(declineReason);
    setShowDeclineModal(false);
  };

  // Check if request is still valid
  if (request.status === 'voided') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Ban size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Request Voided</h2>
          <p className="text-gray-600">This signature request has been voided by the sender.</p>
        </div>
      </div>
    );
  }

  if (request.status === 'expired' || (request.expiresAt && new Date(request.expiresAt) < new Date())) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Clock size={64} className="mx-auto text-orange-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Request Expired</h2>
          <p className="text-gray-600">This signature request has expired. Please contact the sender for a new link.</p>
        </div>
      </div>
    );
  }

  if (signer?.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Signed</h2>
          <p className="text-gray-600">You have already signed this document on {formatDate(signer.signedAt!)}</p>
        </div>
      </div>
    );
  }

  if (signer?.status === 'declined') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <XCircle size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Declined</h2>
          <p className="text-gray-600">You declined to sign this document.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSignature size={24} className="text-blue-600" />
              <div>
                <h1 className="font-semibold text-gray-800">{request.documentName}</h1>
                <p className="text-xs text-gray-500">Requested by {request.createdBy}</p>
              </div>
            </div>
            
            {/* Progress */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filledFields.length}</span>
                <span className="text-gray-400"> / {myFields.length} fields completed</span>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(filledFields.length / myFields.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Document viewer */}
        <div className="flex-1 overflow-auto p-4">
          {/* Zoom and page controls */}
          <div className="sticky top-0 z-30 mb-4 flex items-center justify-center gap-4 bg-gray-100 py-2">
            <div className="flex items-center gap-1 bg-white rounded-lg shadow px-2 py-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm px-2">
                {currentPage} / {request.documentPageCount}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(request.documentPageCount, p + 1))}
                disabled={currentPage === request.documentPageCount}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-1 bg-white rounded-lg shadow px-2 py-1">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          {/* PDF with fields */}
          <div className="flex justify-center">
            <div
              className="relative bg-white shadow-xl"
              style={{
                width: 612 * zoom,
                height: 792 * zoom,
              }}
            >
              {/* PDF page placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <FileText size={64 * zoom} className="mx-auto mb-2" />
                  <p className="text-sm">Page {currentPage}</p>
                </div>
              </div>

              {/* Signature fields */}
              {myFields
                .filter(f => f.pageNumber === currentPage)
                .map(field => {
                  const isFilled = !!field.value;
                  
                  return (
                    <motion.div
                      key={field.id}
                      whileHover={!isFilled ? { scale: 1.02 } : {}}
                      onClick={() => handleFieldClick(field)}
                      className={`absolute border-2 rounded cursor-pointer overflow-hidden
                        ${isFilled 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-blue-400 bg-blue-50 hover:bg-blue-100 animate-pulse'}`}
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      {isFilled ? (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          {field.type === 'signature' || field.type === 'initials' ? (
                            <img src={field.value} alt="Signature" className="max-w-full max-h-full object-contain" />
                          ) : field.type === 'checkbox' ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <span className="text-xs text-gray-700 truncate">{field.value}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600">
                          <span className="text-xs font-medium capitalize">
                            {field.type === 'signature' ? 'Click to sign' : 
                             field.type === 'initials' ? 'Initial here' :
                             field.type === 'date' ? 'Date' :
                             field.type === 'checkbox' ? '☐' :
                             field.placeholder || 'Enter text'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Sidebar - field list */}
        <div className="w-80 bg-white border-l shadow-lg hidden lg:block overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Your Fields</h3>
            <p className="text-sm text-gray-500 mt-1">
              Complete all required fields to finish signing
            </p>
          </div>
          
          <div className="p-4 space-y-2">
            {myFields.map((field, i) => {
              const isFilled = !!field.value;
              const isOnCurrentPage = field.pageNumber === currentPage;
              
              return (
                <button
                  key={field.id}
                  onClick={() => {
                    setCurrentPage(field.pageNumber);
                    if (!isFilled) handleFieldClick(field);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                    ${isOnCurrentPage ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    ${isFilled ? 'opacity-75' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${isFilled ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isFilled ? <Check size={16} /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm capitalize ${isFilled ? 'text-gray-500' : 'text-gray-800'}`}>
                      {field.type}
                      {field.required && !isFilled && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-gray-400">Page {field.pageNumber}</p>
                  </div>
                  {!isOnCurrentPage && (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
          
          {request.message && (
            <div className="p-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Message from sender</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{request.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-white border-t shadow-lg sticky bottom-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setShowDeclineModal(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
          >
            <XCircle size={18} />
            Decline
          </button>
          
          <div className="flex items-center gap-4">
            {/* Mobile progress */}
            <div className="md:hidden text-sm text-gray-600">
              {filledFields.length}/{myFields.length}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Finish Signing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      <AnimatePresence>
        {showSignaturePad && activeField && (
          <SignaturePadModal
            isOpen={showSignaturePad}
            onClose={() => {
              setShowSignaturePad(false);
              setActiveField(null);
            }}
            onSave={handleSignatureSave}
            type={activeField.type as 'signature' | 'initials'}
            signerName={signer?.name}
          />
        )}
      </AnimatePresence>

      {/* Text Input Modal */}
      <AnimatePresence>
        {activeField && activeField.type === 'text' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setActiveField(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Enter Text</h3>
              <input
                type="text"
                autoFocus
                placeholder={activeField.placeholder || 'Enter text...'}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleTextInput((e.target as HTMLInputElement).value);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setActiveField(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) handleTextInput(input.value);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline Modal */}
      <AnimatePresence>
        {showDeclineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeclineModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Decline to Sign</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for declining. The sender will be notified.
              </p>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Reason for declining..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// SIGNATURE STATUS PANEL COMPONENT
// ============================================

interface SignatureStatusPanelProps {
  request: SignatureRequest;
  auditLog: AuditLogEntry[];
  onSendReminder: (signerId: string) => void;
  onVoidRequest: (reason: string) => void;
  onDownloadDocument: () => void;
  onCopySignerLink: (signerId: string) => void;
}

export const SignatureStatusPanel: React.FC<SignatureStatusPanelProps> = ({
  request,
  auditLog,
  onSendReminder,
  onVoidRequest,
  onDownloadDocument,
  onCopySignerLink,
}) => {
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [copiedSignerId, setCopiedSignerId] = useState<string | null>(null);

  const completedSigners = request.signers.filter(s => s.status === 'signed');
  const progress = (completedSigners.length / request.signers.length) * 100;

  const handleCopyLink = (signerId: string) => {
    onCopySignerLink(signerId);
    setCopiedSignerId(signerId);
    setTimeout(() => setCopiedSignerId(null), 2000);
  };

  const handleVoid = () => {
    if (!voidReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    onVoidRequest(voidReason);
    setShowVoidModal(false);
  };

  const getRequestStatusBadge = () => {
    switch (request.status) {
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Completed</span>;
      case 'voided':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Voided</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Expired</span>;
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">In Progress</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Sent</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileSignature size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{request.documentName}</h3>
              <p className="text-sm text-gray-500">Created {formatDate(request.createdAt)}</p>
            </div>
          </div>
          {getRequestStatusBadge()}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Signing progress</span>
            <span className="font-medium">{completedSigners.length} of {request.signers.length} signed</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${request.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
            />
          </div>
        </div>

        {request.expiresAt && request.status !== 'completed' && request.status !== 'voided' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-orange-600">
            <Clock size={14} />
            Expires {formatDate(request.expiresAt)}
          </div>
        )}
      </div>

      {/* Signers list */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Signers</h4>
        <div className="space-y-3">
          {request.signers.map((signer, i) => {
            const StatusIcon = getStatusIcon(signer.status);
            const statusColorClass = getStatusColor(signer.status);
            
            return (
              <div key={signer.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-semibold text-blue-600 shadow-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{signer.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusColorClass}`}>
                      <StatusIcon size={12} />
                      {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{signer.email}</p>
                  {signer.signedAt && (
                    <p className="text-xs text-gray-400 mt-1">Signed {formatDate(signer.signedAt)}</p>
                  )}
                  {signer.declinedAt && (
                    <p className="text-xs text-red-500 mt-1">
                      Declined: {signer.declineReason || 'No reason provided'}
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                {request.status !== 'completed' && request.status !== 'voided' && signer.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(signer.id)}
                      className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
                      title="Copy signing link"
                    >
                      {copiedSignerId === signer.id ? <Check size={16} className="text-green-500" /> : <Link2 size={16} />}
                    </button>
                    <button
                      onClick={() => onSendReminder(signer.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                    >
                      <RefreshCw size={14} />
                      Remind
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t bg-gray-50 flex flex-wrap gap-3">
        {request.status === 'completed' && (
          <button
            onClick={onDownloadDocument}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Download size={16} />
            Download Signed Document
          </button>
        )}
        
        <button
          onClick={() => setShowAuditLog(true)}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2"
        >
          <History size={16} />
          Audit Trail
        </button>
        
        {request.status !== 'completed' && request.status !== 'voided' && (
          <button
            onClick={() => setShowVoidModal(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
          >
            <Ban size={16} />
            Void Request
          </button>
        )}
      </div>

      {/* Void Modal */}
      <AnimatePresence>
        {showVoidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowVoidModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Ban size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Void Signature Request</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This will cancel the signature request. All signers will be notified and the signing links will no longer work.
              </p>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Reason for voiding..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoid}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Void Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Log Modal */}
      <AnimatePresence>
        {showAuditLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuditLog(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <History size={20} className="text-gray-600" />
                  <h3 className="text-lg font-semibold">Audit Trail</h3>
                </div>
                <button onClick={() => setShowAuditLog(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {auditLog.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <History size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>No audit entries yet</p>
                    </div>
                  ) : (
                    auditLog.map((entry, i) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            entry.action === 'completed' ? 'bg-green-100 text-green-600' :
                            entry.action === 'declined' || entry.action === 'voided' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {entry.action === 'completed' ? <CheckCircle size={16} /> :
                             entry.action === 'declined' ? <XCircle size={16} /> :
                             entry.action === 'voided' ? <Ban size={16} /> :
                             entry.action === 'viewed' ? <Eye size={16} /> :
                             entry.action === 'signed' ? <Pencil size={16} /> :
                             <Clock size={16} />}
                          </div>
                          {i < auditLog.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-800 capitalize">
                            {entry.action.replace('_', ' ')}
                            {entry.signerName && <span className="text-gray-500 font-normal"> by {entry.signerName}</span>}
                          </p>
                          {entry.details && (
                            <p className="text-sm text-gray-600 mt-0.5">{entry.details}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatDate(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN EXPORT
// ============================================

export default {
  SignatureRequestModal,
  SignerView,
  SignatureStatusPanel,
  SignaturePadModal,
};
