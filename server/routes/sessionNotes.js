const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const SessionNote = require('../models/SessionNote');
const Session = require('../models/Session');
const User = require('../models/User');
const { logSessionStatusChange } = require('../utils/auditLogger');

/**
 * Session Notes API Routes
 * 
 * Provides CRUD operations for versioned, encrypted session notes.
 * Requirements: 11.3 - Encrypted session notes with timestamp
 */

// @route   POST /api/session-notes
// @desc    Create a new session note
// @access  Private (Psychologist only)
router.post('/', auth, async (req, res) => {
  try {
    const { sessionId, content, noteType, isClientVisible } = req.body;
    
    if (!sessionId || !content) {
      return res.status(400).json({ msg: 'Session ID and content are required' });
    }
    
    // Verify user is a psychologist
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'psychologist' && user.role !== 'admin')) {
      return res.status(403).json({ msg: 'Only psychologists can create session notes' });
    }
    
    // Verify session exists and user is authorized
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Check authorization - must be the session's psychologist or admin
    if (user.role === 'psychologist' && session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to add notes to this session' });
    }
    
    // Create new note
    const note = new SessionNote({
      session: sessionId,
      author: req.user.id,
      authorRole: user.role,
      content,
      noteType: noteType || 'session_notes',
      isClientVisible: isClientVisible || false
    });
    
    await note.save();
    
    // Log the action
    try {
      await logSessionStatusChange({
        sessionId: sessionId,
        previousStatus: 'N/A',
        newStatus: 'Note Added',
        reason: `Session note created (type: ${note.noteType})`,
        userId: req.user.id,
        userRole: user.role,
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log note creation:', auditError.message);
    }
    
    // Populate author info before returning
    await note.populate('author', 'name email role');
    
    console.log(`📝 Session note created for session ${sessionId} by ${user.name}`);
    
    res.status(201).json({
      success: true,
      msg: 'Session note created successfully',
      note: {
        ...note.toDecryptedObject(),
        author: note.author
      }
    });
  } catch (err) {
    console.error('Error creating session note:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET /api/session-notes/session/:sessionId
// @desc    Get all notes for a session
// @access  Private
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeHistory = false } = req.query;
    
    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }
    
    // Get user and check authorization
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check authorization
    const isClient = session.client.toString() === req.user.id;
    const isPsychologist = session.psychologist.toString() === req.user.id;
    const isAdmin = user.role === 'admin';
    
    if (!isClient && !isPsychologist && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to view notes for this session' });
    }
    
    let notes;
    
    if (isClient) {
      // Clients can only see client-visible notes
      notes = await SessionNote.getClientVisibleNotes(sessionId);
    } else if (includeHistory === 'true') {
      // Psychologists and admins can see all versions
      notes = await SessionNote.getNoteVersionHistory(sessionId);
    } else {
      // Get only latest notes
      notes = await SessionNote.getLatestNotes(sessionId);
    }
    
    // Decrypt notes for response
    const decryptedNotes = notes.map(note => ({
      ...note.toDecryptedObject(),
      author: note.author
    }));
    
    res.json({
      success: true,
      sessionId,
      count: decryptedNotes.length,
      notes: decryptedNotes
    });
  } catch (err) {
    console.error('Error fetching session notes:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET /api/session-notes/:noteId
// @desc    Get a specific note by ID
// @access  Private
router.get('/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    const note = await SessionNote.findById(noteId)
      .populate('author', 'name email role')
      .populate('session');
    
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }
    
    // Get user and check authorization
    const user = await User.findById(req.user.id);
    const session = note.session;
    
    const isClient = session.client.toString() === req.user.id;
    const isPsychologist = session.psychologist.toString() === req.user.id;
    const isAdmin = user.role === 'admin';
    
    if (!isClient && !isPsychologist && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to view this note' });
    }
    
    // Clients can only see client-visible notes
    if (isClient && !note.isClientVisible) {
      return res.status(403).json({ msg: 'This note is not available for client viewing' });
    }
    
    res.json({
      success: true,
      note: {
        ...note.toDecryptedObject(),
        author: note.author
      }
    });
  } catch (err) {
    console.error('Error fetching session note:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PUT /api/session-notes/:noteId
// @desc    Update a session note (creates new version)
// @access  Private (Psychologist only)
router.put('/:noteId', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, changeDescription, isClientVisible } = req.body;
    
    if (!content) {
      return res.status(400).json({ msg: 'Content is required' });
    }
    
    // Verify user is a psychologist or admin
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'psychologist' && user.role !== 'admin')) {
      return res.status(403).json({ msg: 'Only psychologists can update session notes' });
    }
    
    // Get existing note
    const existingNote = await SessionNote.findById(noteId).populate('session');
    if (!existingNote) {
      return res.status(404).json({ msg: 'Note not found' });
    }
    
    // Check authorization
    if (user.role === 'psychologist' && existingNote.session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this note' });
    }
    
    // Create new version
    const newNote = await SessionNote.createNewVersion(
      noteId,
      content,
      req.user.id,
      changeDescription || 'Note updated'
    );
    
    // Update client visibility if provided
    if (typeof isClientVisible === 'boolean') {
      newNote.isClientVisible = isClientVisible;
      await newNote.save();
    }
    
    // Log the action
    try {
      await logSessionStatusChange({
        sessionId: existingNote.session._id.toString(),
        previousStatus: `Note v${existingNote.version}`,
        newStatus: `Note v${newNote.version}`,
        reason: changeDescription || 'Session note updated',
        userId: req.user.id,
        userRole: user.role,
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log note update:', auditError.message);
    }
    
    await newNote.populate('author', 'name email role');
    
    console.log(`📝 Session note updated to version ${newNote.version}`);
    
    res.json({
      success: true,
      msg: 'Session note updated successfully',
      note: {
        ...newNote.toDecryptedObject(),
        author: newNote.author
      },
      previousVersion: existingNote.version
    });
  } catch (err) {
    console.error('Error updating session note:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET /api/session-notes/:noteId/versions
// @desc    Get version history for a specific note
// @access  Private (Psychologist/Admin only)
router.get('/:noteId/versions', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    
    // Verify user is a psychologist or admin
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'psychologist' && user.role !== 'admin')) {
      return res.status(403).json({ msg: 'Only psychologists can view note version history' });
    }
    
    // Get the note to find session and noteType
    const note = await SessionNote.findById(noteId).populate('session');
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }
    
    // Check authorization
    if (user.role === 'psychologist' && note.session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to view this note history' });
    }
    
    // Get all versions
    const versions = await SessionNote.getNoteVersionHistory(note.session._id, note.noteType);
    
    // Decrypt and format versions
    const formattedVersions = versions.map(v => ({
      _id: v._id,
      version: v.version,
      content: v.getDecryptedContent(),
      author: v.author,
      isLatest: v.isLatest,
      createdAt: v.createdAt,
      editHistory: v.editHistory
    }));
    
    res.json({
      success: true,
      noteId,
      sessionId: note.session._id,
      noteType: note.noteType,
      totalVersions: formattedVersions.length,
      versions: formattedVersions
    });
  } catch (err) {
    console.error('Error fetching note versions:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PATCH /api/session-notes/:noteId/visibility
// @desc    Toggle client visibility for a note
// @access  Private (Psychologist only)
router.patch('/:noteId/visibility', auth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { isClientVisible } = req.body;
    
    if (typeof isClientVisible !== 'boolean') {
      return res.status(400).json({ msg: 'isClientVisible must be a boolean' });
    }
    
    // Verify user is a psychologist
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'psychologist') {
      return res.status(403).json({ msg: 'Only psychologists can change note visibility' });
    }
    
    const note = await SessionNote.findById(noteId).populate('session');
    if (!note) {
      return res.status(404).json({ msg: 'Note not found' });
    }
    
    // Check authorization
    if (note.session.psychologist.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to modify this note' });
    }
    
    note.isClientVisible = isClientVisible;
    await note.save();
    
    console.log(`📝 Note visibility changed to ${isClientVisible ? 'visible' : 'hidden'} for client`);
    
    res.json({
      success: true,
      msg: `Note is now ${isClientVisible ? 'visible' : 'hidden'} to client`,
      note: {
        _id: note._id,
        isClientVisible: note.isClientVisible
      }
    });
  } catch (err) {
    console.error('Error updating note visibility:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
