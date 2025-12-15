# Real-Time Payment Reconciliation System

## Overview

The Real-Time Payment Reconciliation System provides immediate reconciliation of M-Pesa payment transactions as they occur, rather than waiting for the daily batch reconciliation. This system ensures payment discrepancies are detected and addressed within seconds of occurrence.

## Features

### 🔄 Real-Time Processing
- **Instant Reconciliation**: Triggered automatically on payment events (initiation, callback, status query)
- **Event-Driven Architecture**: Responds to payment lifecycle events in real-time
- **Queue Management**: Handles multiple reconciliation requests efficiently
- **Batch Processing**: Supports bulk reconciliation operations

### 📡 WebSocket Integration
- **Live Updates**: Real-time dashboard updates via WebSocket connections
- **Admin Notifications**: Immediate alerts for discrepancies and issues
- **Connection Management**: Automatic reconnection and heartbeat monitoring
- **Multi-Client Support**: Multiple admin users can connect simultaneously

### 🚨 Alert System
- **Immediate Notifications**: Email and SMS alerts for high-severity discrepancies
- **Severity Classification**: Automatic categorization of issues (high, medium, low)
- **Dashboard Alerts**: Real-time visual alerts in the admin interface
- **Audit Trail**: Complete logging of all reconciliation activities

### 📊 Performance Monitoring
- **Real-Time Statistics**: Processing times, success rates, queue lengths
- **Performance Metrics**: Average processing time, throughput monitoring
- **System Health**: Active reconciliations, connected clients, uptime tracking
- **Historical Data**: Trends and patterns in reconciliation activities

## Architecture

### Components

1. **RealTimeReconciliationService** (`server/services/realTimeReconciliation.js`)
   - Core service managing real-time reconciliation logic
   - Event emitter for system-wide notifications
   - WebSocket client management
   - Statistics tracking and performance monitoring

2. **WebSocket Server** (`server/routes/realTimeReconciliation.js`)
   - WebSocket endpoint for real-time updates
   - Authentication and authorization
   - Message routing and client management

3. **API Endpoints** (`server/routes/realTimeReconciliation.js`)
   - REST API for manual reconciliation triggers
   - Bulk operations support
   - Statistics and monitoring endpoints

4. **Dashboard Component** (`client/src/components/dashboards/RealTimeReconciliationDashboard.js`)
   - React component for admin interface
   - Real-time updates via WebSocket
   - Manual reconciliation controls

### Event Flow

```
Payment Event → M-Pesa Route → Real-Time Service → Reconciliation → WebSocket Broadcast
     ↓              ↓               ↓                ↓              ↓
  Initiation    Callback        Queue/Process    Analysis      Admin Dashboard
  Status Query  Processing      Execution        Results       Notifications
```

## Installation and Setup

### 1. Install Dependencies

```bash
cd server
npm install ws
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Real-Time Reconciliation
ADMIN_EMAIL=admin@smilingsteps.com
ADMIN_PHONE=+254712345678

# WebSocket Configuration (optional)
WS_HEARTBEAT_INTERVAL=30000
WS_RECONNECT_DELAY=5000
```

### 3. Server Integration

The real-time reconciliation system is automatically integrated when you start the server:

```bash
npm start
```

The system will:
- Start the WebSocket server on `/ws/real-time-reconciliation`
- Register API routes under `/api/real-time-reconciliation`
- Begin periodic reconciliation checks every 15 minutes
- Integrate with existing M-Pesa payment flows

## API Reference

### Authentication

All API endpoints require admin authentication:

```javascript
headers: {
  'Authorization': 'Bearer <admin_jwt_token>'
}
```

### Endpoints

#### GET `/api/real-time-reconciliation/stats`
Get current reconciliation statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalProcessed": 150,
    "successfulReconciliations": 145,
    "failedReconciliations": 2,
    "discrepanciesDetected": 3,
    "averageProcessingTime": 1250,
    "activeReconciliations": 0,
    "queueLength": 0,
    "connectedClients": 2,
    "lastProcessedAt": "2024-12-14T10:30:00.000Z"
  }
}
```

#### POST `/api/real-time-reconciliation/session/:sessionId`
Trigger real-time reconciliation for a specific session.

**Request Body:**
```json
{
  "trigger": "manual_dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "sessionId": "507f1f77bcf86cd799439011",
    "status": "matched",
    "sessionDetails": {
      "client": "John Doe",
      "psychologist": "Dr. Smith",
      "amount": 2500,
      "transactionId": "QHX12345"
    },
    "reconciliationMetadata": {
      "trigger": "manual_dashboard",
      "processingTime": 1200,
      "timestamp": "2024-12-14T10:30:00.000Z"
    }
  }
}
```

#### POST `/api/real-time-reconciliation/bulk`
Trigger bulk reconciliation for multiple sessions.

**Request Body:**
```json
{
  "sessionIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "trigger": "bulk_manual"
}
```

#### POST `/api/real-time-reconciliation/queue/:sessionId`
Queue a session for reconciliation.

**Request Body:**
```json
{
  "trigger": "manual_queue"
}
```

#### GET `/api/real-time-reconciliation/active`
Get currently active reconciliations.

**Response:**
```json
{
  "success": true,
  "activeReconciliations": 2,
  "queueLength": 5,
  "connectedClients": 3
}
```

## WebSocket API

### Connection

Connect to the WebSocket endpoint with admin authentication:

```javascript
const ws = new WebSocket('ws://localhost:5000/ws/real-time-reconciliation?token=<admin_jwt_token>');
```

### Message Types

#### Outgoing Messages (Client → Server)

**Ping:**
```json
{ "type": "ping" }
```

**Get Stats:**
```json
{ "type": "get_stats" }
```

**Reconcile Session:**
```json
{
  "type": "reconcile_session",
  "sessionId": "507f1f77bcf86cd799439011"
}
```

#### Incoming Messages (Server → Client)

**Connection Confirmation:**
```json
{
  "type": "connected",
  "clientId": "abc123",
  "message": "Connected to real-time reconciliation service",
  "timestamp": "2024-12-14T10:30:00.000Z"
}
```

**Statistics Update:**
```json
{
  "type": "reconciliation_stats",
  "data": {
    "totalProcessed": 150,
    "successfulReconciliations": 145,
    "averageProcessingTime": 1250
  }
}
```

**Reconciliation Result:**
```json
{
  "type": "reconciliation_result",
  "data": {
    "sessionId": "507f1f77bcf86cd799439011",
    "status": "matched",
    "sessionDetails": { ... },
    "reconciliationMetadata": { ... }
  }
}
```

**Discrepancy Alert:**
```json
{
  "type": "discrepancy_alert",
  "data": {
    "sessionId": "507f1f77bcf86cd799439011",
    "issues": [
      {
        "type": "amount_mismatch",
        "message": "M-Pesa amount differs from session price"
      }
    ],
    "severity": "high",
    "timestamp": "2024-12-14T10:30:00.000Z"
  }
}
```

## Dashboard Usage

### Accessing the Dashboard

1. Log in as an admin user
2. Navigate to the Real-Time Reconciliation dashboard
3. The dashboard will automatically connect via WebSocket

### Dashboard Features

#### Statistics Overview
- **Total Processed**: Number of reconciliations completed
- **Success Rate**: Percentage of successful reconciliations
- **Discrepancies**: Number of issues detected
- **Average Processing Time**: Performance metric in milliseconds

#### Real-Time Monitoring
- **Active Reconciliations**: Currently processing reconciliations
- **Queue Length**: Pending reconciliation requests
- **Connected Clients**: Number of admin users connected

#### Manual Operations
- **Session Reconciliation**: Enter a session ID to trigger immediate reconciliation
- **Queue Management**: Queue sessions for batch processing
- **Bulk Operations**: Process multiple sessions simultaneously

#### Alerts and Notifications
- **Real-Time Alerts**: Immediate notifications for discrepancies
- **Severity Indicators**: Color-coded alerts based on issue severity
- **Detailed Views**: Expandable details for each reconciliation result

### Connection Status

The dashboard displays connection status:
- 🟢 **Connected**: Real-time updates active
- 🔴 **Disconnected**: Attempting to reconnect
- **Auto-refresh Toggle**: Enable/disable automatic reconnection

## Event Triggers

### Automatic Triggers

The system automatically triggers reconciliation on these events:

1. **Payment Initiation** (`onPaymentInitiation`)
   - Triggered when STK Push is sent
   - Verifies initial payment state
   - Queued for processing

2. **Payment Callback** (`onPaymentCallback`)
   - Triggered when M-Pesa callback is received
   - Immediate reconciliation after callback processing
   - 2-second delay to ensure callback completion

3. **Status Query** (`onStatusQuery`)
   - Triggered when payment status is queried
   - Verifies status consistency
   - Queued for processing

4. **Periodic Checks** (`startPeriodicChecks`)
   - Runs every 15 minutes by default
   - Checks sessions stuck in "Processing" status
   - Processes up to 10 sessions per check

### Manual Triggers

Admins can manually trigger reconciliation:

1. **Dashboard Interface**: Enter session ID and click "Reconcile Now"
2. **API Endpoint**: POST to `/api/real-time-reconciliation/session/:sessionId`
3. **WebSocket Message**: Send `reconcile_session` message
4. **Bulk Operations**: Process multiple sessions simultaneously

## Error Handling

### Reconciliation Errors

The system handles various error scenarios:

1. **Session Not Found**: Returns appropriate error message
2. **Network Failures**: Retries with exponential backoff
3. **Processing Timeouts**: Queues for retry
4. **WebSocket Disconnections**: Automatic reconnection

### Error Recovery

- **Automatic Retry**: Failed reconciliations are automatically retried
- **Queue Persistence**: Queued items survive service restarts
- **Graceful Degradation**: System continues operating with reduced functionality

## Performance Considerations

### Optimization Features

1. **Batch Processing**: Groups multiple reconciliations for efficiency
2. **Queue Management**: Prevents system overload
3. **Connection Pooling**: Efficient WebSocket client management
4. **Memory Management**: Automatic cleanup of old results

### Monitoring Metrics

- **Processing Time**: Average time per reconciliation
- **Throughput**: Reconciliations per minute
- **Queue Depth**: Number of pending requests
- **Error Rate**: Percentage of failed reconciliations

### Scaling Recommendations

- **Horizontal Scaling**: Multiple server instances with load balancing
- **Database Optimization**: Proper indexing for reconciliation queries
- **WebSocket Clustering**: Distribute WebSocket connections across servers
- **Caching**: Cache frequently accessed reconciliation data

## Security

### Authentication and Authorization

- **JWT Tokens**: Secure authentication for API and WebSocket
- **Admin-Only Access**: Restricted to admin users only
- **Token Validation**: Continuous validation of authentication tokens

### Data Protection

- **Audit Logging**: Complete audit trail of all reconciliation activities
- **Data Masking**: Phone numbers masked in logs and displays
- **Secure Transmission**: All data encrypted in transit
- **Access Control**: Role-based access to reconciliation features

## Troubleshooting

### Common Issues

#### WebSocket Connection Fails
```bash
# Check server logs for WebSocket errors
tail -f server.log | grep WebSocket

# Verify JWT token is valid
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/real-time-reconciliation/stats
```

#### Reconciliation Not Triggering
```bash
# Check if service is running
curl http://localhost:5000/api/real-time-reconciliation/active

# Verify M-Pesa integration
node test-real-time-reconciliation.js
```

#### Performance Issues
```bash
# Monitor queue length
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/real-time-reconciliation/stats

# Check system resources
top -p $(pgrep node)
```

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=reconciliation:*
NODE_ENV=development
```

### Testing

Run the comprehensive test suite:
```bash
node test-real-time-reconciliation.js
```

This will test:
- Authentication
- API endpoints
- WebSocket connectivity
- Manual reconciliation
- Queue functionality

## Integration Examples

### React Component Integration

```javascript
import RealTimeReconciliationDashboard from './components/dashboards/RealTimeReconciliationDashboard';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <RealTimeReconciliationDashboard />
    </div>
  );
}
```

### Custom WebSocket Client

```javascript
const ws = new WebSocket(`ws://localhost:5000/ws/real-time-reconciliation?token=${token}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'discrepancy_alert') {
    // Handle discrepancy alert
    showNotification(`Discrepancy in session ${message.data.sessionId}`);
  }
};
```

### API Integration

```javascript
// Trigger reconciliation
const response = await fetch('/api/real-time-reconciliation/session/123', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ trigger: 'manual' })
});

const result = await response.json();
console.log('Reconciliation result:', result);
```

## Best Practices

### Performance
- Use bulk operations for multiple sessions
- Monitor queue length to prevent overload
- Implement proper error handling and retries

### Security
- Always validate admin authentication
- Use secure WebSocket connections (WSS) in production
- Implement rate limiting for API endpoints

### Monitoring
- Set up alerts for high discrepancy rates
- Monitor processing times and queue lengths
- Log all reconciliation activities for audit

### Maintenance
- Regularly review reconciliation statistics
- Clean up old reconciliation results
- Update alert thresholds based on system performance

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Run the test suite to identify specific problems
3. Review server logs for detailed error information
4. Contact the development team with specific error messages

---

**Last Updated**: December 14, 2024
**Version**: 1.0.0
**Status**: Production Ready