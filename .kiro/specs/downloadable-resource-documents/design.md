# Downloadable Resource Documents - Design

## Overview

This design implements a simple file upload system where admins can upload PDF documents through the admin dashboard, add metadata, and make them available for users to download. The solution uses Multer for file uploads, stores PDFs in the file system, and serves them through secure API endpoints. This approach gives admins full control over document quality and content.

## Architecture

### High-Level Flow

```
1. Admin Upload PDF → 2. Add Metadata → 3. File Storage → 4. User Download/View
```

**Components:**
- File Upload Handler (Multer middleware)
- Admin Resource Management UI (integrated into Admin Dashboard)
- File Storage System (local filesystem with organized structure)
- Download API Endpoint (Express route with authentication)
- Frontend Resource Cards (enhanced ResourcesPage component)

### Technology Stack

- **File Upload**: Multer (Express middleware for multipart/form-data)
- **File Storage**: Local filesystem (`server/uploads/resources/`)
- **File Validation**: File type and size validation
- **Serving**: Express static file serving with authentication middleware

## Components and Interfaces

### 1. File Upload Middleware

**Location**: `server/middleware/uploadResource.js`

**Purpose**: Handle PDF file uploads with validation

**Configuration**:
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'server/uploads/resources/',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
```

### 2. Admin Resource Management API

**Location**: `server/routes/resources.js`

**New Endpoints**:

```javascript
// Create resource with file upload (admin only)
POST /api/resources/upload
  - Authentication: Required (admin)
  - Body: multipart/form-data with PDF file + metadata
  - Fields: title, description, type, category, tags, requiresAuth, accessLevel
  - Returns: Created resource with file info

// Update resource (admin only)
PUT /api/resources/:id
  - Authentication: Required (admin)
  - Body: JSON metadata (no file)
  - Updates resource fields
  - Returns: Updated resource

// Replace resource file (admin only)
PUT /api/resources/:id/file
  - Authentication: Required (admin)
  - Body: multipart/form-data with new PDF file
  - Deletes old file, uploads new one
  - Returns: Updated resource

// Delete resource (admin only)
DELETE /api/resources/:id
  - Authentication: Required (admin)
  - Deletes database record and file
  - Returns: Success message
```

### 3. Admin Dashboard Resource Management UI

**Location**: `client/src/components/dashboards/AdminDashboard-new.js`

**New Section**: Resources Management Tab

**Features**:
- List all resources with edit/delete actions
- Create new resource form with file upload
- Drag-and-drop file upload area
- Real-time file size display
- Preview uploaded PDF
- Form validation

**Form Fields**:
```javascript
{
  file: File (required),
  title: String (required),
  description: String (required),
  type: Select ['Guide', 'Worksheet', 'Tool', 'Article'] (required),
  category: Select (required),
  tags: Array of strings,
  difficulty: Select ['beginner', 'intermediate', 'advanced'],
  requiresAuth: Boolean,
  accessLevel: Select ['public', 'client'],
  active: Boolean
}
```

### 4. Download/View Endpoints

**Location**: `server/routes/resources.js`

**Endpoints** (already exist, just need to ensure they work with uploaded files):

```javascript
// Download PDF file
GET /api/resources/:id/download
  - Serves file with download headers
  - Increments download counter
  - Validates authentication if required

// View/Preview PDF
GET /api/resources/:id/view
  - Serves file with inline display headers
  - Increments view counter
  - Validates authentication if required
```

### 5. Frontend Resource Cards

**Location**: `client/src/pages/ResourcesPage.js`

**Enhancements**:
- Display file size in human-readable format
- Show download/view counts
- Add loading states for downloads
- Handle authentication redirects
- Display success/error messages

## Data Models

### Resource Model Updates

**Add Fields**:
```javascript
{
  filePath: String,        // Path to uploaded PDF file
  fileName: String,        // Original filename
  fileSize: Number,        // File size in bytes
  uploadedAt: Date,        // When file was uploaded
  lastModified: Date       // When file was last replaced
}
```

## File Storage Structure

```
server/uploads/resources/
├── 1699876543210-addiction-guide.pdf
├── 1699876544320-mood-tracker.pdf
├── 1699876545430-relapse-worksheet.pdf
└── ...
```

## Error Handling

### Upload Errors
- **File Too Large**: Return 400, "File size exceeds 10MB limit"
- **Invalid File Type**: Return 400, "Only PDF files are allowed"
- **No File Provided**: Return 400, "Please upload a PDF file"
- **Disk Space Error**: Return 500, "Unable to save file"

### Download Errors
- **File Not Found**: Return 404, "Resource file not found"
- **Permission Denied**: Return 403, redirect to login
- **Server Error**: Return 500, log error details

### User-Facing Messages
- "Uploading file..." (loading state)
- "Resource created successfully!" (success)
- "Please log in to download this resource" (auth required)
- "File size must be under 10MB" (validation error)

## Security Considerations

- Validate file types on both client and server
- Sanitize filenames to prevent path traversal
- Enforce file size limits
- Store files outside web root
- Validate user permissions before serving files
- Use secure headers when serving PDFs
- Rate limit upload and download endpoints

## Performance Considerations

- Stream large files instead of loading into memory
- Implement file compression for storage
- Use CDN for production deployment
- Cache file metadata in database
- Monitor disk space usage
- Implement file cleanup for deleted resources

## Implementation Phases

### Phase 1: Backend Infrastructure
1. Install Multer dependency
2. Create upload middleware with validation
3. Set up file storage directory
4. Create upload API endpoint

### Phase 2: Admin Dashboard UI
1. Add Resources tab to admin dashboard
2. Create resource list view
3. Build upload form with file picker
4. Add edit/delete functionality
5. Implement form validation

### Phase 3: Download Functionality
1. Update download endpoint to serve uploaded files
2. Add authentication checks
3. Implement view/preview endpoint
4. Add download/view counters

### Phase 4: Frontend Enhancements
1. Update ResourcesPage to show file sizes
2. Improve download button functionality
3. Add loading states and error handling
4. Test on mobile devices

### Phase 5: Testing and Polish
1. Test file upload with various PDF sizes
2. Verify authentication enforcement
3. Test download flow on different browsers
4. Optimize file serving performance
5. Add admin documentation

## Future Enhancements

- Support for multiple file formats (DOCX, EPUB)
- Bulk upload functionality
- File versioning system
- Automatic thumbnail generation
- Usage analytics dashboard
- Email delivery of resources
- Resource collections/bundles
