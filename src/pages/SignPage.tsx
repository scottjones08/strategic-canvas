// SignPage.tsx - Public e-signature page for signers
// Token-based access for signing documents without authentication

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Pen,
  Calendar,
  Type,
  Square,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useSignerView, SignatureField } from '../hooks/useSignatures';
import { SignaturePad } from '../components/SignaturePad';

// Configure PDF.js worker - use bundled worker to avoid CDN version mismatch
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ============================================
// Main SignPage Component
// ============================================

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const {
    signer,
    request,
    fields,
    isLoading,
    error,
    signField,
    completeSignature,
    declineSignature,
  } = useSignerView(token || null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate progress
  const requiredFields = fields.filter((f) => f.required);
  const completedFields = fields.filter((f) => f.value);
  const progress = requiredFields.length > 0 
    ? (completedFields.length / requiredFields.length) * 100 
    : 0;

  // Fields for current page
  const currentPageFields = fields.filter((f) => f.page_number === currentPage);

  // Handle PDF load
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
  }, []);

  // Handle field click
  const handleFieldClick = (field: SignatureField) => {
    if (field.value) return; // Already signed
    setSelectedField(field);
    
    if (field.type === 'signature' || field.type === 'initials') {
      setShowSignaturePad(true);
    } else if (field.type === 'date') {
      // Auto-fill with current date
      signField(field.id, new Date().toLocaleDateString());
    }
  };

  // Handle signature save
  const handleSignatureSave = async (dataUrl: string) => {
    if (!selectedField) return;
    
    await signField(selectedField.id, dataUrl);
    setShowSignaturePad(false);
    setSelectedField(null);
  };

  // Handle complete
  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      await completeSignature();
      setShowCompleteModal(true);
    } catch (err) {
      console.error('Error completing signature:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle decline
  const handleDecline = async (reason: string) => {
    try {
      setIsSubmitting(true);
      await declineSignature(reason);
      setShowDeclineModal(false);
      navigate('/sign/declined');
    } catch (err) {
      console.error('Error declining:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Unable to Load Document</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!signer || !request) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Document Not Found</h1>
          <p className="mt-2 text-gray-600">
            This signing link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="font-semibold text-gray-900">{request.title}</h1>
              <p className="text-sm text-gray-500">
                Signing as: {signer.name} ({signer.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {completedFields.length}/{requiredFields.length}
              </span>
            </div>

            {/* Actions */}
            <button
              onClick={() => setShowDeclineModal(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Decline
            </button>
            <button
              onClick={handleComplete}
              disabled={progress < 100 || isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Complete Signing
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* PDF Viewer */}
        <main className="flex-1 p-4">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                >
                  -
                </button>
                <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale((s) => Math.min(2, s + 0.25))}
                  className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                >
                  +
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-gray-200 rounded"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* PDF Document */}
            <div className="relative overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="flex justify-center p-4">
                <div className="relative">
                  <Document
                    file={request.document?.file_url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      </div>
                    }
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>

                  {/* Signature Fields Overlay */}
                  {currentPageFields.map((field) => (
                    <SignatureFieldOverlay
                      key={field.id}
                      field={field}
                      scale={scale}
                      onClick={() => handleFieldClick(field)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Field List Sidebar */}
        <aside className="w-72 bg-white border-l p-4 hidden lg:block">
          <h2 className="font-semibold text-gray-900 mb-4">Required Fields</h2>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <button
                key={field.id}
                onClick={() => {
                  setCurrentPage(field.page_number);
                  handleFieldClick(field);
                }}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  field.value
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FieldTypeIcon type={field.type} />
                    <span className="text-sm font-medium capitalize">{field.type}</span>
                  </div>
                  {field.value && <CheckCircle className="w-4 h-4 text-green-600" />}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Page {field.page_number} • Field {index + 1}
                </p>
              </button>
            ))}
          </div>

          {request.message && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-900 mb-2">Message from sender</h3>
              <p className="text-sm text-indigo-700">{request.message}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Signature Pad Modal */}
      <AnimatePresence>
        {showSignaturePad && selectedField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <SignaturePad
                onSave={handleSignatureSave}
                onCancel={() => {
                  setShowSignaturePad(false);
                  setSelectedField(null);
                }}
                type={selectedField.type === 'initials' ? 'initials' : 'signature'}
                signerName={signer.name}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline Modal */}
      <AnimatePresence>
        {showDeclineModal && (
          <DeclineModal
            onConfirm={handleDecline}
            onCancel={() => setShowDeclineModal(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Complete Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Document Signed Successfully!
              </h2>
              <p className="mt-2 text-gray-600">
                Thank you for signing. You will receive a copy of the completed document via email.
              </p>
              <button
                onClick={() => window.close()}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close Window
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Signature Field Overlay Component
// ============================================

interface SignatureFieldOverlayProps {
  field: SignatureField;
  scale: number;
  onClick: () => void;
}

function SignatureFieldOverlay({ field, scale, onClick }: SignatureFieldOverlayProps) {
  // Convert relative coordinates to pixels (assuming 612x792 base PDF size)
  const baseWidth = 612;
  const baseHeight = 792;
  
  const style = {
    position: 'absolute' as const,
    left: field.x * baseWidth * scale,
    top: field.y * baseHeight * scale,
    width: field.width * baseWidth * scale,
    height: field.height * baseHeight * scale,
  };

  return (
    <motion.button
      onClick={onClick}
      style={style}
      className={`border-2 border-dashed rounded transition-colors ${
        field.value
          ? 'border-green-500 bg-green-100/50 cursor-default'
          : 'border-indigo-500 bg-indigo-100/50 hover:bg-indigo-200/50 cursor-pointer'
      }`}
      whileHover={!field.value ? { scale: 1.02 } : undefined}
      whileTap={!field.value ? { scale: 0.98 } : undefined}
    >
      {field.value ? (
        // Show signed value
        field.type === 'signature' || field.type === 'initials' ? (
          <img
            src={field.value}
            alt="Signature"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-xs text-gray-700 p-1">{field.value}</span>
        )
      ) : (
        // Show placeholder
        <div className="w-full h-full flex items-center justify-center text-indigo-600">
          <FieldTypeIcon type={field.type} />
          <span className="ml-1 text-xs capitalize">{field.type}</span>
        </div>
      )}
    </motion.button>
  );
}

// ============================================
// Field Type Icon Component
// ============================================

function FieldTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'signature':
    case 'initials':
      return <Pen className="w-4 h-4" />;
    case 'date':
      return <Calendar className="w-4 h-4" />;
    case 'text':
      return <Type className="w-4 h-4" />;
    case 'checkbox':
      return <Square className="w-4 h-4" />;
    default:
      return <Pen className="w-4 h-4" />;
  }
}

// ============================================
// Decline Modal Component
// ============================================

interface DeclineModalProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function DeclineModal({ onConfirm, onCancel, isSubmitting }: DeclineModalProps) {
  const [reason, setReason] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Decline to Sign?</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Please let the sender know why you're declining to sign this document.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter your reason (optional)"
          className="w-full px-3 py-2 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Decline to Sign
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
