# Therapist Account Management System

## Overview
Admin-created therapist accounts are now **automatically approved** and can be **enabled/disabled** by admins.

## Key Changes

### 1. Auto-Approval on Creation
- When admin creates a therapist account, it's automatically set to:
  - `approvalStatus: 'approved'`
  - `isActive: true`
- Therapists can login immediately after account creation
- No manual approval step needed

### 2. Enable/Disable Functionality
Instead of approve/reject, admins can now:
- **Enable** - Therapist can login and accept clients
- **Disable** - Therapist cannot login (account blocked)

## Admin Dashboard

### Psychologists Tab
Shows all therapists with:
- Name
- Email
- **Account Status** (Active/Disabled)
- Specializations
- Join date
- **Enable/Disable button**

### How to Manage Therapists

1. **Login as Admin**
2. **Go to Admin Dashboard**
3. **Click "Psychologists" tab**
4. **Toggle Status:**
   - Click "Disable" to block a therapist's access
   - Click "Enable" to restore access

## Backend Routes

### Create Psychologist (Auto-Approved)
```
POST /api/admin/psychologists
```
Creates therapist with automatic approval

### Toggle Account Status
```
PUT /api/admin/psychologists/:id/toggle-status
```
Enables or disables therapist account

## Login Protection

When a disabled therapist tries to login:
```json
{
  "success": false,
  "message": "Account disabled",
  "errors": ["Your account has been disabled by an administrator. Please contact support for assistance."]
}
```

## Migration Script

To auto-approve all existing therapists:
```bash
node auto-approve-existing-psychologists.js
```

This will:
- Set all therapists to `approvalStatus: 'approved'`
- Set all therapists to `isActive: true`
- Allow immediate login for all

## Benefits

✅ **Simpler workflow** - No approval step for admin-created accounts
✅ **Better control** - Enable/disable instead of approve/reject
✅ **Clearer status** - Active vs Disabled (not Pending/Approved/Rejected)
✅ **Immediate access** - Therapists can login right after creation
✅ **Account management** - Easy to temporarily disable problematic accounts

## Files Modified

- `server/routes/admin.js` - Added create & toggle-status endpoints
- `server/routes/users.js` - Added active account check on login
- `client/src/components/dashboards/AdminDashboard-new.js` - Updated UI for enable/disable
- `auto-approve-existing-psychologists.js` - Migration script
