# Automatic Issue Resolution System

## Overview

The Automatic Issue Resolution System is an intelligent automation layer that detects and resolves common M-Pesa payment issues without manual intervention. This system continuously monitors payment transactions and automatically corrects inconsistencies, timeouts, and other common problems.

## Features

### 🔧 Automatic Resolution Types

1. **Timeout Recovery**
   - Detects payments stuck in "Processing" status
   - Queries M-Pesa API to get actual payment status
   - Updates session status based on real M-Pesa data

2. **Status Verification**
   - Verifies consistency between payment and session status
   - Corrects mismatched statuses automatically
   - Ensures data integrity across the system

3. **Orphaned Payment Resolution**
   - Finds payments with transaction IDs but wrong status
   - Validates and corrects payment status
   - Prevents revenue loss from untracked payments

4. **Duplicate Callback Handling**
   - Detects and resolves duplicate M-Pesa callbacks
   - Prevents double-charging and data corruption
   - Maintains transaction integrity

5. **Amount Mismatch Correction**
   - Identifies discrepancies between expected and actual amounts
   - Automatically corrects minor rounding differences
   - Flags significant mismatches for manual review

6. **Status Inconsistency Fixes**
   - Resolves conflicts between payment and session status
   - Ensures proper workflow progression
   - Maintains business logic integrity

7. **Failed Callback Retry**
   - Reprocesses failed callback data
   - Recovers from temporary processing failures
   - Ensures no payments are lost due to technical issues

8. **API Synchronization**
   - Synchronizes local data with M-Pesa API
   - Resolves discrepancies between systems
   - Maintains data consistency

### 🤖 Intelligent Detection

- **Continuous Monitoring**: Runs every 10 minutes automatically
- **Pattern Recognition**: Identifies common issue patterns
- **Risk Assessment**: Prioritizes issues by severity and impact
- **Retry Logic**: Implements exponential backoff for failed resolutions

### 🛡️ Safety Mechanisms

- **Maximum Attempts**: Limits automatic resolution attempts (default: 3)
- **Manual Intervention Flags**: Escalates complex issues to admins
- **Audit Trail**: Logs all resolution attempts and outcomes
- **Rollback Protection**: Prevents destructive changes

## Configuration

### Environment Variables

```bash
# Automatic resolution settings (optional)
AUTO_RESOLUTION_MAX_ATTEMPTS=3
AUTO_RESOLUTION_TIMEOUT_WINDOW=300000  # 5 minutes in ms
AUTO_RESOLUTION_RETRY_INTERVAL=600000  # 10 minutes in ms

# Admin notifications
ADMIN_EMAIL=admin@smilingsteps.com
ADMIN_PHONE=+254700000000
```

### System Configuration

The system uses the following configuration (in `server/utils/automaticIssueResolver.js`):

```javascript
const RESOLUTION_CONFIG = {
  MAX_AUTO_RESOLUTION_ATTEMPTS: 3,
  IMMEDIATE_RESOLUTION_WINDOW: 5 * 60 * 1000,    // 5 minutes
  DELAYED_RESOLUTION_WINDOW: 30 * 60 * 1000,     // 30 minutes
  EXTENDED_RESOLUTION_WINDOW: 2 * 60 * 60 * 1000, // 2 hours
  
  RETRY_INTERVALS: {
    timeout: 2 * 60 * 1000,           // 2 minutes
    api_unavailable: 5 * 60 * 1000,   // 5 minutes
    system_error: 10 * 60 * 1000,     // 10 minutes
    unclear_status: 3 * 60 * 1000,    // 3 minutes
    orphaned_payment: 15 * 60 * 1000  // 15 minutes
  }
};
```

## API Endpoints

### Admin Endpoints

All endpoints require admin authentication (`x-auth-token` header).

#### Get System Status
```http
GET /api/issue-resolution/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "systemActive": true,
    "lastRun": "2024-12-14T10:30:00Z",
    "config": { ... },
    "supportedIssueTypes": [...]
  }
}
```

#### Manual Detection and Resolution
```http
POST /api/issue-resolution/detect-and-resolve
```

**Response:**
```json
{
  "success": true,
  "message": "Issue detection and resolution completed",
  "results": {
    "totalIssues": 5,
    "resolved": 3,
    "failed": 2
  }
}
```

#### Resolve Specific Issue
```http
POST /api/issue-resolution/resolve-specific
Content-Type: application/json

{
  "sessionId": "session_id_here",
  "issueType": "timeout_recovery",
  "context": {}
}
```

#### Get Potential Issues
```http
GET /api/issue-resolution/potential-issues
```

**Response:**
```json
{
  "success": true,
  "potentialIssues": [
    {
      "sessionId": "...",
      "client": "John Doe",
      "psychologist": "Dr. Smith",
      "paymentStatus": "Processing",
      "issues": [
        {
          "type": "timeout_recovery",
          "description": "Payment processing timeout",
          "severity": "medium"
        }
      ]
    }
  ],
  "summary": {
    "total": 1,
    "high": 0,
    "medium": 1,
    "low": 0
  }
}
```

#### Schedule Resolution
```http
POST /api/issue-resolution/schedule
Content-Type: application/json

{
  "sessionId": "session_id_here",
  "issueType": "timeout_recovery",
  "delayMinutes": 5,
  "context": {}
}
```

## Admin Dashboard

### Accessing the Dashboard

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Click on "Issue Resolution" tab
4. View system status and potential issues

### Dashboard Features

- **System Status**: View current system state and configuration
- **Issue List**: See all detected potential issues
- **Manual Actions**: Trigger resolution for specific issues
- **Scheduling**: Schedule resolution attempts for later
- **Real-time Updates**: Refresh data and see current status

### Issue Severity Levels

- **🔴 High**: Critical issues requiring immediate attention
  - Orphaned payments with transaction IDs
  - Status inconsistencies with confirmed payments
  - Significant amount mismatches

- **🟡 Medium**: Important issues that should be resolved soon
  - Payment timeouts
  - API synchronization issues
  - Failed callback retries

- **🔵 Low**: Minor issues that can be resolved automatically
  - Small amount rounding differences
  - Minor status inconsistencies

## Monitoring and Alerts

### Automatic Notifications

The system automatically sends notifications when:

- **Issues Detected**: Admin receives summary of detected issues
- **Resolution Failed**: Notification when automatic resolution fails
- **Manual Intervention Required**: Alert when human review is needed

### Notification Channels

1. **Email Alerts**: Detailed issue reports sent to admin email
2. **SMS Alerts**: Critical issue notifications via SMS
3. **Dashboard Alerts**: Real-time notifications in admin interface

### Alert Configuration

```javascript
// Email alerts for discrepancies
const adminEmail = process.env.ADMIN_EMAIL;
if (adminEmail) {
  await notificationService.sendReconciliationDiscrepancyAlert(results, adminEmail);
}

// SMS alerts for critical issues
const adminPhone = process.env.ADMIN_PHONE;
if (adminPhone) {
  await notificationService.sendReconciliationDiscrepancySMS(results, adminPhone);
}
```

## Testing

### Running Tests

```bash
# Run the comprehensive test suite
node test-automatic-issue-resolution.js
```

### Test Scenarios

The test suite covers all resolution types:

1. **Timeout Recovery**: Tests payment timeout detection and resolution
2. **Status Verification**: Tests status consistency checks
3. **Orphaned Payment**: Tests orphaned payment detection and correction
4. **Duplicate Callback**: Tests duplicate callback handling
5. **Amount Mismatch**: Tests amount discrepancy resolution
6. **Status Inconsistency**: Tests status conflict resolution
7. **Failed Callback Retry**: Tests callback reprocessing
8. **API Sync Issue**: Tests API synchronization

### Test Output

```
🚀 Starting Automatic Issue Resolution Tests

✅ Connected to test database
✅ Test users created
✅ Created test session for timeout_recovery: 507f1f77bcf86cd799439011

🔧 Testing timeout_recovery resolution...
📊 Resolution result: { success: true, reason: 'payment_confirmed_via_query' }
📋 Session after resolution: { paymentStatus: 'Paid', sessionStatus: 'Confirmed' }

📊 TEST SUMMARY
================
✅ Successful resolutions: 7
❌ Failed resolutions: 1
🔍 Automatic detection: Success
```

## Integration Points

### M-Pesa Callback Integration

The system integrates with M-Pesa callbacks to trigger automatic resolution:

```javascript
// In server/routes/mpesa.js callback handler
setTimeout(async () => {
  try {
    if (ResultCode !== 0) {
      await automaticIssueResolver.resolveIssue(
        automaticIssueResolver.ResolvableIssueTypes.FAILED_CALLBACK_RETRY,
        { sessionId: session._id, callbackData: req.body }
      );
    } else {
      await automaticIssueResolver.resolveIssue(
        automaticIssueResolver.ResolvableIssueTypes.STATUS_VERIFICATION,
        { sessionId: session._id }
      );
    }
  } catch (resolverError) {
    console.error('⚠️ Automatic issue resolution failed:', resolverError);
  }
}, 1000);
```

### Reconciliation Integration

The system works with the payment reconciliation system to detect and resolve discrepancies automatically.

### Audit Trail Integration

All resolution attempts are logged in the audit trail for compliance and debugging.

## Best Practices

### 1. Monitor Resolution Success Rates

- Track resolution success rates by issue type
- Identify patterns in failed resolutions
- Adjust configuration based on performance

### 2. Review Manual Intervention Cases

- Regularly review issues flagged for manual intervention
- Update resolution logic based on common manual fixes
- Document resolution procedures for complex cases

### 3. Test Resolution Logic

- Run test suite regularly to ensure system reliability
- Test with real-world scenarios when possible
- Validate resolution logic after system updates

### 4. Configure Appropriate Timeouts

- Set reasonable timeout windows for different issue types
- Balance between quick resolution and system stability
- Monitor timeout effectiveness and adjust as needed

### 5. Maintain Audit Trail

- Ensure all resolution attempts are logged
- Review audit logs for patterns and issues
- Use logs for debugging and system improvement

## Troubleshooting

### Common Issues

#### 1. Resolution Not Triggering

**Symptoms**: Issues detected but no automatic resolution attempts

**Solutions**:
- Check system status via API endpoint
- Verify configuration settings
- Review server logs for errors
- Ensure database connectivity

#### 2. High False Positive Rate

**Symptoms**: Many issues detected that don't need resolution

**Solutions**:
- Review detection criteria
- Adjust timeout windows
- Update issue classification logic
- Fine-tune severity thresholds

#### 3. Resolution Failures

**Symptoms**: Resolution attempts failing consistently

**Solutions**:
- Check M-Pesa API connectivity
- Verify authentication credentials
- Review error logs for specific failures
- Test individual resolution functions

#### 4. Performance Impact

**Symptoms**: System slowdown during resolution runs

**Solutions**:
- Adjust resolution frequency
- Optimize database queries
- Implement batch processing
- Monitor system resources

### Debug Mode

Enable debug logging for detailed resolution information:

```javascript
// Set environment variable
DEBUG_ISSUE_RESOLUTION=true

// Or modify code temporarily
console.log('🔍 Debug: Resolution attempt details:', {
  sessionId,
  issueType,
  context,
  attemptNumber
});
```

### Log Analysis

Key log patterns to monitor:

```bash
# Successful resolutions
grep "Successfully resolved" /var/log/smiling-steps.log

# Failed resolutions
grep "Maximum resolution attempts reached" /var/log/smiling-steps.log

# Manual intervention flags
grep "Flagging session.*for manual intervention" /var/log/smiling-steps.log

# System errors
grep "Automatic issue resolution failed" /var/log/smiling-steps.log
```

## Security Considerations

### 1. Access Control

- All resolution endpoints require admin authentication
- Resolution actions are logged with user identification
- Sensitive data is masked in logs and responses

### 2. Data Protection

- Phone numbers are masked in all logs
- Transaction IDs are partially obscured in non-admin contexts
- Resolution attempts are audited for compliance

### 3. Rate Limiting

- Maximum resolution attempts prevent infinite loops
- Exponential backoff prevents API abuse
- System-wide limits protect against resource exhaustion

### 4. Validation

- All resolution actions validate session ownership
- Input validation prevents malicious data injection
- Business logic validation ensures data integrity

## Performance Optimization

### 1. Database Optimization

- Indexes on frequently queried fields
- Efficient query patterns for issue detection
- Batch processing for multiple resolutions

### 2. API Optimization

- Connection pooling for M-Pesa API calls
- Request queuing during API unavailability
- Caching of frequently accessed data

### 3. Memory Management

- Cleanup of old resolution tracking data
- Efficient data structures for issue tracking
- Garbage collection of completed resolutions

## Future Enhancements

### 1. Machine Learning Integration

- Pattern recognition for issue prediction
- Automated threshold adjustment based on success rates
- Intelligent prioritization of resolution attempts

### 2. Advanced Analytics

- Resolution success rate trending
- Issue type frequency analysis
- Performance impact measurement

### 3. Enhanced Notifications

- Webhook notifications for external systems
- Slack/Teams integration for admin alerts
- Mobile app notifications for critical issues

### 4. Self-Healing Capabilities

- Automatic configuration adjustment
- Dynamic timeout optimization
- Adaptive retry strategies

---

## Support

For technical support or questions about the Automatic Issue Resolution System:

1. **Documentation**: Review this guide and API documentation
2. **Logs**: Check system logs for detailed error information
3. **Testing**: Run the test suite to verify system functionality
4. **Monitoring**: Use the admin dashboard to monitor system health

**Contact**: For additional support, contact the development team with specific error messages and system logs.