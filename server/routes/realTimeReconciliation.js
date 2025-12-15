/**
 * Real-Time Reconciliation WebSocket and API Routes
 * Provides WebSocket connections and REST endpoints for real-time reconciliation
 */

const express = require('express');
const WebSocket = require('ws');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const realTimeReconciliationService = require('../services/realTimeReconciliation');
const auditLogger = require('../utils/auditLogger');

/**
 * Middleware to check admin access
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// @route   POST api/real-time-reconciliation/session/:sessionId
// @desc    Trigger real-time reconciliation for a specific session
// @access  Private (Admin only)
router.post('/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { trigger = 'manual' } = req.body;

    // Validate session ID format
    if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid session ID format' });
    }

    // Trigger real-time reconciliation
    const result = await realTimeReconciliationService.reconcileSessionRealTime(
      sessionId, 
      trigger
    );

    // Log admin action for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Trigger real-time reconciliation',
      accessedData: `Session ${sessionId} reconciliation`,
      sessionId,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      msg: 'Real-time reconciliation completed',
      result
    });

  } catch (error) {
    console.error('❌ Real-time reconciliation error:', error);
    res.status(500).json({ 
      msg: 'Real-time reconciliation failed',
      error: error.message 
    });
  }
});

// @route   POST api/real-time-reconciliation/bulk
// @desc    Trigger real-time reconciliation for multiple sessions
// @access  Private (Admin only)
router.post('/bulk', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionIds, trigger = 'bulk_manual' } = req.body;

    // Validate input
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ msg: 'Session IDs array is required' });
    }

    if (sessionIds.length > 50) {
      return res.status(400).json({ msg: 'Maximum 50 sessions allowed per bulk operation' });
    }

    // Validate session ID formats
    const invalidIds = sessionIds.filter(id => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        msg: 'Invalid session ID formats',
        invalidIds 
      });
    }

    // Trigger bulk reconciliation
    const results = await realTimeReconciliationService.reconcileMultipleSessions(
      sessionIds, 
      trigger
    );

    // Log admin action for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Trigger bulk real-time reconciliation',
      accessedData: `${sessionIds.length} sessions bulk reconciliation`,
      metadata: { sessionCount: sessionIds.length, trigger },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      msg: `Bulk real-time reconciliation completed for ${sessionIds.length} sessions`,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status !== 'error').length,
        errors: results.filter(r => r.status === 'error').length
      }
    });

  } catch (error) {
    console.error('❌ Bulk real-time reconciliation error:', error);
    res.status(500).json({ 
      msg: 'Bulk real-time reconciliation failed',
      error: error.message 
    });
  }
});

// @route   GET api/real-time-reconciliation/stats
// @desc    Get real-time reconciliation statistics
// @access  Private (Admin only)
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = realTimeReconciliationService.getStats();

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View real-time reconciliation stats',
      accessedData: 'Real-time reconciliation statistics',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Stats retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve stats',
      error: error.message 
    });
  }
});

// @route   POST api/real-time-reconciliation/queue/:sessionId
// @desc    Queue a session for reconciliation
// @access  Private (Admin only)
router.post('/queue/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { trigger = 'manual_queue' } = req.body;

    // Validate session ID format
    if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid session ID format' });
    }

    // Queue for reconciliation
    realTimeReconciliationService.queueReconciliation(sessionId, trigger);

    // Log admin action for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'Queue session for reconciliation',
      accessedData: `Session ${sessionId} queued for reconciliation`,
      sessionId,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      msg: 'Session queued for reconciliation',
      sessionId,
      trigger
    });

  } catch (error) {
    console.error('❌ Queue reconciliation error:', error);
    res.status(500).json({ 
      msg: 'Failed to queue reconciliation',
      error: error.message 
    });
  }
});

// @route   GET api/real-time-reconciliation/active
// @desc    Get currently active reconciliations
// @access  Private (Admin only)
router.get('/active', auth, requireAdmin, async (req, res) => {
  try {
    const stats = realTimeReconciliationService.getStats();

    // Log admin access for audit trail
    auditLogger.logAdminAccess({
      adminId: req.user.id,
      action: 'View active reconciliations',
      accessedData: 'Active reconciliation processes',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      activeReconciliations: stats.activeReconciliations,
      queueLength: stats.queueLength,
      connectedClients: stats.connectedClients
    });

  } catch (error) {
    console.error('❌ Active reconciliations retrieval error:', error);
    res.status(500).json({ 
      msg: 'Failed to retrieve active reconciliations',
      error: error.message 
    });
  }
});

/**
 * Setup WebSocket server for real-time updates
 */
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/real-time-reconciliation'
  });

  console.log('📡 Real-Time Reconciliation WebSocket server started on /ws/real-time-reconciliation');

  wss.on('connection', async (ws, req) => {
    console.log('📡 New WebSocket connection for real-time reconciliation');

    // Extract admin ID from query parameters or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication token required');
      return;
    }

    try {
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify admin role
      const user = await User.findById(decoded.user.id);
      if (!user || user.role !== 'admin') {
        ws.close(1008, 'Admin access required');
        return;
      }

      // Register client with real-time reconciliation service
      const clientId = realTimeReconciliationService.registerWebSocketClient(ws, user._id);

      // Log WebSocket connection for audit trail
      auditLogger.logAdminAccess({
        adminId: user._id,
        action: 'Connect to real-time reconciliation WebSocket',
        accessedData: 'Real-time reconciliation updates',
        metadata: { clientId },
        ipAddress: req.socket.remoteAddress
      });

      // Handle incoming messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
              break;
              
            case 'get_stats':
              const stats = realTimeReconciliationService.getStats();
              ws.send(JSON.stringify({ 
                type: 'reconciliation_stats', 
                data: stats 
              }));
              break;
              
            case 'reconcile_session':
              if (data.sessionId) {
                // Queue session for reconciliation
                realTimeReconciliationService.queueReconciliation(
                  data.sessionId, 
                  'websocket_request'
                );
                
                ws.send(JSON.stringify({ 
                  type: 'reconciliation_queued', 
                  sessionId: data.sessionId 
                }));
              }
              break;
              
            default:
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Unknown message type' 
              }));
          }
          
        } catch (error) {
          console.error('❌ WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Connected to real-time reconciliation service',
        timestamp: new Date()
      }));

    } catch (error) {
      console.error('❌ WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  });

  return wss;
}

module.exports = {
  router,
  setupWebSocketServer
};