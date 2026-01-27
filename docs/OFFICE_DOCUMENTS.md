# Microsoft Office Document Support

This document describes the Microsoft Office document support added to Strategic Canvas, including Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) viewing and editing capabilities.

## Overview

Strategic Canvas now supports viewing and editing Microsoft Office documents alongside PDFs. The implementation offers multiple viewer modes to suit different needs:

- **Native Viewer** - Client-side rendering using mammoth.js (Word), xlsx/SheetJS (Excel)
- **Google Docs Viewer** - Free, works with publicly accessible URLs
- **Microsoft Office Online** - Best compatibility, may require Microsoft 365
- **OnlyOffice** - Self-hosted option with full editing support

## Components

### OfficeViewer

The main component for rendering Office documents.

```tsx
import { OfficeViewer } from '@/components';

// Basic usage with a file
<OfficeViewer 
  file={selectedFile}
  viewerMode="native"
  editMode="view"
  onLoad={(info) => console.log('Loaded:', info)}
/>

// Usage with URL
<OfficeViewer 
  url="https://example.com/document.docx"
  viewerMode="google"
/>

// Full editing with OnlyOffice
<OfficeViewer 
  url={documentUrl}
  viewerMode="onlyoffice"
  editMode="edit"
  onlyOfficeConfig={{
    documentServerUrl: 'https://your-onlyoffice-server.com',
    jwt: 'your-jwt-token',
  }}
  onSave={async (data) => {
    // Save the document
  }}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `File` | - | File object to display |
| `url` | `string` | - | URL to the document |
| `arrayBuffer` | `ArrayBuffer` | - | Raw document data |
| `filename` | `string` | - | Filename (required with arrayBuffer) |
| `viewerMode` | `'native' \| 'onlyoffice' \| 'microsoft' \| 'google'` | `'native'` | Viewer rendering mode |
| `editMode` | `'view' \| 'edit'` | `'view'` | Read-only or editable |
| `onlyOfficeConfig` | `OnlyOfficeConfig` | - | OnlyOffice server configuration |
| `onLoad` | `(info: OfficeDocumentInfo) => void` | - | Called when document loads |
| `onError` | `(error: Error) => void` | - | Called on error |
| `onSave` | `(data: Blob \| ArrayBuffer) => Promise<void>` | - | Save handler |
| `onShare` | `() => void` | - | Share button handler |
| `onDownload` | `() => void` | - | Download button handler |
| `onPrint` | `() => void` | - | Print button handler |
| `onClose` | `() => void` | - | Close button handler |
| `showToolbar` | `boolean` | `true` | Show/hide toolbar |
| `height` | `string \| number` | `'100%'` | Component height |
| `width` | `string \| number` | `'100%'` | Component width |

### OfficeDocumentModal

Modal wrapper for viewing documents in a dialog.

```tsx
import { OfficeDocumentModal, useOfficeDocumentModal } from '@/components';

// Using the hook
function MyComponent() {
  const { openWithFile, openWithUrl, close, ModalComponent } = useOfficeDocumentModal();
  
  const handleFileSelect = (file: File) => {
    openWithFile(file, 'view');
  };

  return (
    <>
      <button onClick={() => openWithUrl('https://example.com/doc.xlsx')}>
        View Spreadsheet
      </button>
      <ModalComponent />
    </>
  );
}

// Direct usage
<OfficeDocumentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  file={selectedFile}
  initialViewerMode="native"
  allowFullscreen={true}
/>
```

## Hooks

### useOfficeDocument

Hook for programmatic Office document processing.

```tsx
import { useOfficeDocument } from '@/hooks/useOfficeDocument';

function DocumentProcessor() {
  const {
    isLoading,
    error,
    info,
    wordContent,
    excelWorkbook,
    powerPointPresentation,
    loadDocument,
    loadFromUrl,
  } = useOfficeDocument({
    onLoad: (info) => console.log('Document info:', info),
    onError: (err) => console.error('Load error:', err),
  });

  const handleFileSelect = async (file: File) => {
    await loadDocument(file);
    
    if (wordContent) {
      console.log('Word HTML:', wordContent.html);
      console.log('Plain text:', wordContent.text);
    }
    
    if (excelWorkbook) {
      console.log('Sheets:', excelWorkbook.sheets.map(s => s.name));
      console.log('First sheet data:', excelWorkbook.sheets[0].data);
    }
  };

  return (/* ... */);
}
```

### useExcelDocument

Specialized hook for Excel document manipulation.

```tsx
import { useExcelDocument } from '@/hooks/useOfficeDocument';

function SpreadsheetEditor() {
  const {
    workbook,
    activeSheet,
    activeSheetIndex,
    isLoading,
    loadWorkbook,
    setActiveSheetIndex,
    updateCell,
    addSheet,
    removeSheet,
    exportToFile,
  } = useExcelDocument();

  // Load a file
  const handleLoad = async (file: File) => {
    await loadWorkbook(file);
  };

  // Update a cell
  const handleCellEdit = (row: number, col: number, value: any) => {
    updateCell(activeSheetIndex, row, col, value);
  };

  // Export to file
  const handleExport = async () => {
    const blob = await exportToFile('export.xlsx');
    if (blob) {
      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.xlsx';
      a.click();
    }
  };

  return (/* ... */);
}
```

## Utilities

### office-utils.ts

Utility functions for Office document handling.

```tsx
import {
  detectOfficeType,
  isOfficeDocument,
  isWordDocument,
  isExcelDocument,
  isPowerPointDocument,
  getOfficeDocumentInfo,
  OFFICE_TYPE_COLORS,
  OFFICE_TYPE_LABELS,
  getMicrosoftOfficeEmbedUrl,
  getGoogleDocsViewerUrl,
} from '@/lib/office-utils';

// Detect document type
const type = detectOfficeType('report.xlsx'); // 'excel'
const type2 = detectOfficeType('file.pptx', 'application/vnd.ms-powerpoint'); // 'powerpoint'

// Check document type
if (isOfficeDocument(file.name, file.type)) {
  // Handle Office document
}

// Get document info from File object
const info = getOfficeDocumentInfo(file);
console.log(info.type, info.size, info.extension);

// Get colors for UI
const color = OFFICE_TYPE_COLORS['word']; // '#2B579A'
const label = OFFICE_TYPE_LABELS['excel']; // 'Excel Spreadsheet'

// Get embed URLs
const googleUrl = getGoogleDocsViewerUrl(documentUrl);
const msUrl = getMicrosoftOfficeEmbedUrl('word', documentUrl, { edit: true });
```

## Viewer Modes

### Native Viewer

Uses client-side JavaScript libraries:
- **Word** - mammoth.js converts DOCX to HTML
- **Excel** - xlsx (SheetJS) parses spreadsheet data
- **PowerPoint** - JSZip extracts basic structure (full rendering requires external viewer)

**Pros:**
- No external service required
- Works offline
- Fast for simple documents

**Cons:**
- May not render complex formatting perfectly
- Limited PowerPoint support
- Large files may be slow

### Google Docs Viewer

Embeds Google's free document viewer via iframe.

**Pros:**
- Good compatibility
- Free to use
- Supports most Office formats

**Cons:**
- Requires internet connection
- Document URL must be publicly accessible
- No editing support

### Microsoft Office Online

Embeds Microsoft's Office Online viewer/editor.

**Pros:**
- Best compatibility with Office formats
- Full editing support (with M365)
- Collaborative editing

**Cons:**
- May require Microsoft 365 subscription
- Document must be accessible via URL
- Some features require authentication

### OnlyOffice

Self-hosted document server with full editing.

**Pros:**
- Full control over infrastructure
- Complete editing support
- No external dependencies (once deployed)

**Cons:**
- Requires server deployment
- More complex setup
- Resource intensive

## OnlyOffice Integration

For enterprise deployments, we recommend OnlyOffice Document Server.

### Setup

1. Deploy OnlyOffice Document Server (Docker):
```bash
docker run -i -t -d -p 80:80 onlyoffice/documentserver
```

2. Configure in your app:
```tsx
const onlyOfficeConfig: OnlyOfficeConfig = {
  documentServerUrl: 'https://docs.yourcompany.com',
  apiKey: 'your-api-key',
  jwt: 'your-jwt-token', // For security
};

<OfficeViewer
  url={documentUrl}
  viewerMode="onlyoffice"
  onlyOfficeConfig={onlyOfficeConfig}
  editMode="edit"
/>
```

### Callback URL

For save functionality, configure a callback URL:

```tsx
const editorConfig = createOnlyOfficeConfig(config, document, {
  mode: 'edit',
  callbackUrl: 'https://yourapp.com/api/onlyoffice/callback',
  user: { id: 'user123', name: 'John Doe' },
});
```

Your callback endpoint should handle save events from OnlyOffice.

## File Upload Integration

The `useFileUpload` hook now supports Office documents:

```tsx
import { useFileUpload, getOfficeFileAccept } from '@/hooks/useFileUpload';

function UploadArea() {
  const { uploadFile, isUploading, progress } = useFileUpload({
    allowOfficeDocuments: true, // Enable Office support
    maxSizeMB: 50,
  });

  return (
    <input
      type="file"
      accept={getOfficeFileAccept()} // ".pdf,.docx,.xlsx,.pptx,..."
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const result = await uploadFile(file);
          console.log('Uploaded:', result);
          // result includes: officeType, sheetCount, slideCount, etc.
        }
      }}
    />
  );
}
```

## DocumentsView Integration

The DocumentsView component automatically handles Office documents:

- Shows appropriate icons (Word blue, Excel green, PowerPoint orange)
- Displays sheet/slide count instead of page count
- Accepts Office files via drag-and-drop
- Generates placeholder thumbnails with document type colors

## Best Practices

1. **Choose the right viewer mode:**
   - Use `native` for quick previews and offline access
   - Use `google` for simple viewing with public URLs
   - Use `microsoft` for best Office compatibility
   - Use `onlyoffice` for full editing capabilities

2. **Handle large files:**
   - Consider lazy loading for large spreadsheets
   - Use pagination for presentations
   - Stream large documents when possible

3. **Security:**
   - Use JWT authentication with OnlyOffice
   - Validate file types on the server
   - Sanitize HTML output from mammoth.js
   - Use signed URLs for private documents

4. **Error handling:**
   - Provide fallback viewers when native parsing fails
   - Show meaningful error messages
   - Allow users to download the original file

## Troubleshooting

### "mammoth.js not available"

Install the package:
```bash
npm install mammoth
```

### "xlsx (SheetJS) not available"

Install the package:
```bash
npm install xlsx
```

### "OnlyOffice API not available"

Check that the OnlyOffice Document Server is running and accessible.

### "Document URL must be publicly accessible"

For Google Docs and Microsoft Office viewers, the document URL must be reachable from the viewer's servers. Use signed URLs or move documents to public storage.

### Complex formatting not rendering

Switch to Microsoft Office or OnlyOffice viewer for better compatibility.

## Dependencies

Required packages:
- `mammoth` - Word document parsing
- `xlsx` - Excel document parsing
- `jszip` - Office document structure extraction

Optional for OnlyOffice:
- OnlyOffice Document Server (self-hosted or cloud)

## License

The Office document support uses the following libraries:
- mammoth.js - BSD-2-Clause
- SheetJS (xlsx) - Apache-2.0
- JSZip - MIT
