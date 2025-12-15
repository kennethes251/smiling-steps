# Implementation Plan - Downloadable Resource Documents (Upload-Based)

- [x] 1. Set up file upload infrastructure


  - Install Multer dependency (`npm install multer`)
  - Create uploads directory structure (server/uploads/resources/)
  - Add uploads directory to .gitignore
  - _Requirements: 1.1, 4.1_





- [ ] 2. Implement file upload middleware
  - [ ] 2.1 Create upload middleware with Multer
    - Create server/middleware/uploadResource.js
    - Configure storage destination and filename generation


    - Add file type validation (PDF only)
    - Set file size limit (10MB max)
    - _Requirements: 1.2, 4.1_

  - [x] 2.2 Add error handling for uploads



    - Handle file size exceeded errors
    - Handle invalid file type errors
    - Handle disk space errors
    - Return user-friendly error messages
    - _Requirements: 1.2_

- [x] 3. Create resource upload API endpoint
  - [x] 3.1 Add POST /api/resources/upload endpoint
    - Use Multer middleware for file handling
    - Validate admin authentication
    - Extract metadata from request body
    - Save file and create database record
    - Return created resource with file info
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3_

  - [x] 3.2 Add PUT /api/resources/:id endpoint with file replacement
    - Allow admins to replace existing PDF files
    - Delete old file from filesystem
    - Upload new file
    - Update database record
    - _Requirements: 1.5, 4.3_



  - [x] 3.3 Update DELETE /api/resources/:id endpoint
    - Delete PDF file from filesystem when resource is deleted
    - Remove database record
    - Handle file not found gracefully
    - _Requirements: 4.4_

- [x] 4. Update Resource model
  - Add filePath, fileName, fileSize, uploadedAt, and lastModified fields to Resource schema
  - Update existing resources in database to include new fields
  - _Requirements: 1.3, 3.4, 4.1_

- [x] 5. Build admin resource management UI
  - [x] 5.1 Add Resources tab to Admin Dashboard
    - Create new tab in AdminDashboard-new.js
    - Add navigation to Resources management section
    - Display list of all resources
    - _Requirements: 1.1_

  - [x] 5.2 Create resource upload form
    - Build form with file upload input
    - Add drag-and-drop file upload area
    - Include metadata fields (title, description, type, category, tags)
    - Add form validation
    - Show file size preview
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_

  - [x] 5.3 Implement resource list view
    - Display all resources in a table or card grid
    - Show file name, size, upload date
    - Add edit and delete buttons for each resource
    - Include search and filter functionality
    - _Requirements: 1.1, 3.4_

  - [x] 5.4 Add edit resource functionality
    - Create edit form to update metadata
    - Allow file replacement
    - Show current file information
    - Validate changes before saving
    - _Requirements: 1.5, 4.3_

  - [x] 5.5 Implement delete confirmation
    - Add confirmation dialog before deleting
    - Show warning that file will be permanently deleted
    - Handle delete errors gracefully
    - _Requirements: 4.4_

- [x] 6. Update download endpoints
  - [x] 6.1 Ensure download endpoint serves uploaded files
    - Update GET /api/resources/:id/download to serve from uploads directory
    - Set proper download headers (Content-Disposition: attachment)
    - Set filename from resource data
    - Increment download counter
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.5_

  - [x] 6.2 Ensure view endpoint works with uploaded files
    - Update GET /api/resources/:id/view to serve from uploads directory
    - Set inline display headers (Content-Disposition: inline)
    - Increment view counter
    - Handle authentication for protected resources
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 6.3 Add authentication middleware
    - Check resource.requiresAuth field
    - Redirect to login if authentication required
    - Allow public access for public resources
    - _Requirements: 2.3, 6.4_

- [x] 7. Enhance frontend ResourcesPage
  - [x] 7.1 Update resource cards to show file information
    - Display file size in human-readable format (KB/MB)
    - Show upload date
    - Add file icon or PDF badge
    - _Requirements: 3.4, 5.2, 5.3_

  - [x] 7.2 Improve download button functionality
    - Add loading state during download
    - Show success message after download
    - Handle authentication redirects
    - Display error messages for failed downloads
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.3 Enhance view/preview functionality
    - Open PDF in new tab for preview
    - Add preview button alongside download
    - Ensure mobile responsiveness
    - _Requirements: 6.1, 6.3, 6.5_

  - [x] 7.4 Add download/view statistics display
    - Show download count on resource cards
    - Show view count on resource cards
    - Update counts in real-time after user actions
    - _Requirements: 5.5_

- [ ] 8. Testing and validation
  - [ ] 8.1 Test file upload functionality
    - Upload PDFs of various sizes (small, medium, large)
    - Test file size limit enforcement (try >10MB)
    - Test invalid file type rejection (try non-PDF)
    - Verify files are saved correctly
    - _Requirements: 1.2, 1.3_

  - [ ] 8.2 Test admin resource management
    - Create new resources with file uploads
    - Edit resource metadata
    - Replace resource files
    - Delete resources and verify files are removed
    - _Requirements: 1.1, 1.4, 1.5, 4.3, 4.4_

  - [ ] 8.3 Test download functionality
    - Download resources on different browsers
    - Test authentication enforcement
    - Verify download counters increment
    - Test with and without login
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 8.4 Test view/preview functionality
    - Preview PDFs in browser
    - Test on mobile devices
    - Verify view counters increment
    - Test authentication for protected resources
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ] 8.5 Test error scenarios
    - Test with missing files
    - Test with invalid resource IDs
    - Test authentication failures
    - Verify error messages display correctly
    - _Requirements: 2.3, 6.4_

- [ ] 9. Documentation and cleanup
  - Create admin guide for uploading resources
  - Document file upload API endpoints
  - Add code comments
  - Update API documentation
  - Create user guide for downloading resources
  - _Requirements: All_
