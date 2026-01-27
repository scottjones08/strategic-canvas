// SignaturePad.tsx - Signature capture component for e-signatures
// Supports draw, type, and upload signature methods

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, Type, Upload, Undo2, Trash2, Check, X } from 'lucide-react';
import SignaturePadLib from 'signature_pad';

// ================================
// Main SignaturePad Component
// ================================
interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  signerName?: string;
  type?: 'signature' | 'initials';
}

export function SignaturePad({
  onSave,
  onCancel,
  width = 500,
  height = 200,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  signerName = '',
  type = 'signature',
}: SignaturePadProps) {
  const [inputType, setInputType] = useState<'draw' | 'type' | 'upload'>('draw');

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {type === 'signature' ? 'Add Your Signature' : 'Add Your Initials'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="px-6 py-3 border-b bg-gray-50 flex gap-2">
        {[
          { id: 'draw' as const, label: 'Draw', icon: Pen },
          { id: 'type' as const, label: 'Type', icon: Type },
          { id: 'upload' as const, label: 'Upload', icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setInputType(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputType === id
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {inputType === 'draw' && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DrawSignature
                onSave={onSave}
                width={type === 'initials' ? 200 : width}
                height={type === 'initials' ? 100 : height}
                penColor={penColor}
                backgroundColor={backgroundColor}
              />
            </motion.div>
          )}

          {inputType === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TypeSignature
                onSave={onSave}
                name={signerName}
                type={type}
              />
            </motion.div>
          )}

          {inputType === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <UploadSignature onSave={onSave} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legal disclaimer */}
      <div className="px-6 py-3 border-t bg-gray-50">
        <p className="text-xs text-gray-500">
          By signing, you agree that this electronic signature is the legal equivalent of your
          manual signature on this document.
        </p>
      </div>
    </div>
  );
}

// ================================
// Draw Signature Component
// ================================
interface DrawSignatureProps {
  onSave: (dataUrl: string) => void;
  width: number;
  height: number;
  penColor: string;
  backgroundColor: string;
}

function DrawSignature({ onSave, width, height, penColor, backgroundColor }: DrawSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const signaturePad = new SignaturePadLib(canvas, {
      penColor,
      backgroundColor,
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16,
    });

    signaturePad.addEventListener('beginStroke', () => setIsEmpty(false));
    signaturePadRef.current = signaturePad;

    return () => {
      signaturePad.off();
    };
  }, [width, height, penColor, backgroundColor]);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleUndo = () => {
    if (signaturePadRef.current) {
      const data = signaturePadRef.current.toData();
      if (data && data.length > 0) {
        data.pop();
        signaturePadRef.current.fromData(data);
        setIsEmpty(data.length === 0);
      }
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white p-2">
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair"
          style={{ width, height }}
        />
        {/* Signature line */}
        <div className="absolute bottom-6 left-8 right-8 border-b border-gray-400" />
        <span className="absolute bottom-2 left-8 text-xs text-gray-400">Sign above</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={isEmpty}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={isEmpty}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isEmpty}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Apply Signature
        </button>
      </div>
    </div>
  );
}

// ================================
// Type Signature Component
// ================================
interface TypeSignatureProps {
  onSave: (dataUrl: string) => void;
  name: string;
  type: 'signature' | 'initials';
}

const signatureFonts = [
  { name: 'Brush Script MT, cursive', label: 'Brush Script' },
  { name: 'Lucida Handwriting, cursive', label: 'Lucida' },
  { name: 'Segoe Script, cursive', label: 'Segoe' },
  { name: 'Comic Sans MS, cursive', label: 'Comic' },
];

function TypeSignature({ onSave, name, type }: TypeSignatureProps) {
  const [text, setText] = useState(type === 'initials' && name ? getInitials(name) : name);
  const [selectedFont, setSelectedFont] = useState(signatureFonts[0].name);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = `italic 48px ${selectedFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [text, selectedFont, onSave]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={type === 'initials' ? 'Type your initials' : 'Type your name'}
        className="w-full px-4 py-3 text-xl border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-2">
        {signatureFonts.map((font) => (
          <button
            key={font.name}
            onClick={() => setSelectedFont(font.name)}
            className={`p-4 rounded-lg border-2 text-center transition-colors ${
              selectedFont === font.name
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span
              className="text-2xl"
              style={{ fontFamily: font.name, fontStyle: 'italic' }}
            >
              {text || (type === 'initials' ? 'AB' : 'Your Name')}
            </span>
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} width={500} height={100} className="hidden" />

      <button
        onClick={generateSignature}
        disabled={!text}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        Apply Signature
      </button>
    </div>
  );
}

// ================================
// Upload Signature Component
// ================================
interface UploadSignatureProps {
  onSave: (dataUrl: string) => void;
}

function UploadSignature({ onSave }: UploadSignatureProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
      >
        {uploadedImage ? (
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded signature"
              className="max-h-32 max-w-full object-contain"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadedImage(null);
              }}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {uploadedImage && (
        <button
          onClick={() => onSave(uploadedImage)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Check className="w-4 h-4" />
          Apply Signature
        </button>
      )}
    </div>
  );
}

// Helper function
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

export default SignaturePad;
