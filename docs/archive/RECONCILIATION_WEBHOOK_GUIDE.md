# Reconciliation Webhook System Guide

## Overview

The Reconciliation Webhook System allows external systems to be automatically notified when payment reconciliation processes are completed. This enables real-time integration with accounting systems, monitoring tools, and other business applications.

## Features

- **Automatic Notifications**: Webhooks are sent for both manual and daily automatic reconciliation
- **Secure Delivery**: HMAC-SHA256 signature verification for webhook authenticity
- **Retry Logic**: Automatic retry with exponential backoff for failed deliveries
- **Multiple Endpoints**: Support for multiple webhook URLs
- **Rich Payload**: Comprehensive reconciliation data in webhook payload
- **Admin Management**: Configuration and testing endpoints for administrators

## Configuration

### Environment Variables

```bash
# Required: Comma-separated list of webhook URLs
RECONCILIATION_WEBHOOK_URLS=https://your-system.com/webhooks/reconciliation,https://backup-system.com/hooks

# Optional: Secret for webhook signature verification
RECONCILIATION_WEBHOOK_SECRET=your-secure-webhook-secret

# Optional: Retry configuration (defaults shown)
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=1000
```

### Example Configuration

```bash
# Production example
RECONCILIATION_WEBHOOK_URLS=https://accounting.company.com/api/reconciliation-webhook,https://monitoring.company.com/webhooks/mpesa

# Development example
RECONCILIATION_WEBHOOK_URLS=https://webhook.site/your-unique-id

# Webhook secret (recommended for production)
RECONCILIATION_WEBHOOK_SECRET=super-secure-random-string-here
```

## Webhook Events

### Event Types

1. **reconciliation.completed** - Manual reconciliation completed
2. **reconciliation.daily_completed** - Daily automatic reconciliation completed
3. **reconciliation.test** - Test webhook (admin-triggered)

### Webhook Payload Structure

```json
{
  "event": "reconciliation.completed",
  "timestamp": "2024-12-14T20:00:00.000Z",
  "data": {
    "summary": {
      "totalTransactions": 25,
      "matched": 23,
      "unmatched": 1,
      "discrepancies": 1,
      "pendingVerification": 0,
      "errors": 0,
      "totalAmount": 12500,
      "dateRange": {
        "startDate": "2024-12-13T00:00:00.000Z",
        "endDate": "2024-12-13T23:59:59.999Z"
      },
      "timestamp": "2024-12-14T20:00:00.000Z"
    },
    "reconciliationId": "550e8400-e29b-41d4-a716-446655440000",
    "dateRange": {
      "startDate": "2024-12-13T00:00:00.000Z",
      "endDate": "2024-12-13T23:59:59.999Z"
    },
    "statistics": {
      "totalTransactions": 25,
      "matched": 23,
      "unmatched": 1,
      "discrepancies": 1,
      "pendingVerification": 0,
      "errors": 0,
      "totalAmount": 12500
    },
    "hasIssues": true,
    "issuesSummary": [
      "1 transaction(s) with discrepancies",
      "1 unmatched transaction(s)"
    ],
    "reconciliationType": "manual",
    "triggeredBy": "admin-user-id"
  },
  "metadata": {
    "source": "smiling-steps-reconciliation",
    "version": "1.0",
    "environment": "production"
  }
}
```

### Webhook Headers

```http
Content-Type: application/json
User-Agent: Smiling-Steps-Reconciliation-Webhook/1.0
X-Webhook-Event: reconciliation.completed
X-Webhook-Timestamp: 2024-12-14T20:00:00.000Z
X-Webhook-Attempt: 1
X-Webhook-Signature: a1b2c3d4e5f6... (if secret configured)
```

## Security

### Signature Verification

If `RECONCILIATION_WEBHOOK_SECRET` is configured, webhooks include an HMAC-SHA256 signature in the `X-Webhook-Signature` header.

#### Verification Process

1. **Extract Signature**: Get signature from `X-Webhook-Signature` header
2. **Canonical Payload**: Create JSON string with sorted keys
3. **Generate HMAC**: Use HMAC-SHA256 with your secret
4. **Compare**: Use timing-safe comparison

#### Example Verification (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // Create canonical JSON (sorted keys)
  const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
  
  // Generate expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(canonicalPayload);
  const expectedSignature = hmac.digest('hex');
  
  // Timing-safe comparison
  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  
  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

// Usage in webhook handler
app.post('/webhook/reconciliation', (req, res) => {
  const signature = req.header('X-Webhook-Signature');
  const isValid = verifyWebhookSignature(req.body, signature, process.env.WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
  res.json({ received: true });
});
```

#### Example Verification (Python)

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    # Create canonical JSON (sorted keys)
    canonical_payload = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    
    # Generate expected signature
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        canonical_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Timing-safe comparison
    return hmac.compare_digest(signature, expected_signature)
```

## API Endpoints

### Test Webhook Connectivity

```http
POST /api/reconciliation/webhook/test
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "2/2 webhooks successful",
  "results": [
    {
      "success": true,
      "url": "https://your-system.com/webhooks/reconciliation",
      "status": 200,
      "attempt": 1,
      "timestamp": "2024-12-14T20:00:00.000Z"
    }
  ]
}
```

### Get Webhook Configuration

```http
GET /api/reconciliation/webhook/config
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "config": {
    "webhookUrlsConfigured": 2,
    "webhookUrls": [
      "https://your-system.com/webhooks/reconciliation",
      "https://backup-system.com/hooks"
    ],
    "secretConfigured": true,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

## Integration Examples

### Accounting System Integration

```javascript
// Express.js webhook handler for accounting system
app.post('/api/reconciliation-webhook', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (event === 'reconciliation.completed') {
      const { summary, hasIssues, issuesSummary } = data;
      
      // Update accounting records
      await updateAccountingRecords({
        totalAmount: summary.totalAmount,
        transactionCount: summary.totalTransactions,
        reconciliationDate: summary.timestamp
      });
      
      // Alert if issues found
      if (hasIssues) {
        await sendAccountingAlert({
          message: `Reconciliation issues detected: ${issuesSummary.join(', ')}`,
          severity: 'warning'
        });
      }
      
      console.log('Reconciliation data processed successfully');
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

### Monitoring System Integration

```javascript
// Monitoring system webhook handler
app.post('/webhooks/mpesa', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (event === 'reconciliation.completed') {
      const { statistics, hasIssues } = data;
      
      // Send metrics to monitoring system
      metrics.gauge('mpesa.reconciliation.total_transactions', statistics.totalTransactions);
      metrics.gauge('mpesa.reconciliation.matched_transactions', statistics.matched);
      metrics.gauge('mpesa.reconciliation.total_amount', statistics.totalAmount);
      
      // Alert on issues
      if (hasIssues) {
        alerts.send({
          title: 'M-Pesa Reconciliation Issues',
          message: `${statistics.discrepancies} discrepancies, ${statistics.unmatched} unmatched`,
          severity: 'warning'
        });
      }
    }
    
    res.json({ status: 'processed' });
  } catch (error) {
    console.error('Monitoring webhook error:', error);
    res.status(500).json({ error: 'Failed to process' });
  }
});
```

## Testing

### Manual Testing

1. **Configure Webhook URL**:
   ```bash
   export RECONCILIATION_WEBHOOK_URLS=https://webhook.site/your-unique-id
   ```

2. **Run Test Script**:
   ```bash
   node test-reconciliation-webhook.js
   ```

3. **Trigger Manual Reconciliation**:
   - Login as admin
   - Go to reconciliation dashboard
   - Run manual reconciliation
   - Check webhook.site for received payload

### Automated Testing

```bash
# Run comprehensive webhook tests
npm test -- --grep "webhook"

# Test specific webhook functionality
node test-reconciliation-webhook.js
```

## Troubleshooting

### Common Issues

#### 1. Webhooks Not Being Sent

**Symptoms**: No webhook notifications received

**Solutions**:
- Check `RECONCILIATION_WEBHOOK_URLS` is set correctly
- Verify URLs are accessible from server
- Check server logs for webhook errors
- Test connectivity with `/api/reconciliation/webhook/test`

#### 2. Signature Verification Failing

**Symptoms**: Receiving webhooks but signature validation fails

**Solutions**:
- Ensure `RECONCILIATION_WEBHOOK_SECRET` matches on both ends
- Verify canonical JSON generation (sorted keys)
- Check for encoding issues (UTF-8)
- Use timing-safe comparison functions

#### 3. Webhook Delivery Failures

**Symptoms**: Webhooks timing out or failing

**Solutions**:
- Check target server is responding within 30 seconds
- Verify SSL certificates are valid
- Check firewall/network connectivity
- Review retry configuration

#### 4. Missing Webhook Data

**Symptoms**: Webhooks received but missing expected data

**Solutions**:
- Check reconciliation completed successfully
- Verify webhook payload structure
- Review server logs for errors
- Test with manual reconciliation

### Debug Mode

Enable debug logging:

```bash
export DEBUG=reconciliation:webhook
export NODE_ENV=development
```

### Log Analysis

Check server logs for webhook-related messages:

```bash
# Successful webhook delivery
✅ Webhook delivered successfully to https://your-system.com/webhooks/reconciliation: 200

# Failed webhook delivery
❌ Webhook delivery failed to https://your-system.com/webhooks/reconciliation (attempt 1): timeout

# Retry attempt
🔄 Retrying webhook to https://your-system.com/webhooks/reconciliation in 2000ms...
```

## Best Practices

### Security

1. **Always verify signatures** in production
2. **Use HTTPS** for all webhook URLs
3. **Validate payload structure** before processing
4. **Log webhook events** for audit trails
5. **Rate limit** webhook endpoints if needed

### Reliability

1. **Implement idempotency** using reconciliationId
2. **Handle retries gracefully** (webhook system retries automatically)
3. **Respond quickly** (< 30 seconds timeout)
4. **Use proper HTTP status codes** (200 for success, 4xx/5xx for errors)
5. **Monitor webhook health** regularly

### Performance

1. **Process webhooks asynchronously** when possible
2. **Batch database operations** if processing multiple events
3. **Cache frequently accessed data**
4. **Use connection pooling** for database connections
5. **Monitor response times**

## Support

For webhook-related issues:

1. **Check server logs** for error messages
2. **Test connectivity** using admin endpoints
3. **Verify configuration** with `/api/reconciliation/webhook/config`
4. **Run test script** to validate functionality
5. **Contact support** with specific error messages and logs

---

**Last Updated**: December 14, 2024  
**Version**: 1.0  
**Status**: Production Ready