# Psychologist Self-Registration System

## Overview
Therapists can now register themselves on the platform. Their accounts require admin approval before they can login and accept clients.

## How It Works

### For Psychologists:

1. **Visit Registration Page**: `/register/psychologist`
2. **Fill Application Form**:
   - Name, Email, Password
   - Specializations (select multiple)
   - Years of Experience
   - Education & Qualifications
   - Professional Bio
3. **Submit Application**
4. **Wait for Approval**: Account status is "Pending"
5. **Receive Notification**: Admin approves/rejects
6. **Login**: Once approved, can login and access dashboard

### For Admins:

1. **View Applications**: Admin Dashboard → Psychologists Tab
2. **See Pending Applications**: Yellow "Pending Approval" chip
3. **Review Details**: Name, email, specializations, join date
4. **Take Action**:
   - Click "Approve" → Account activated, psychologist can login
   - Click "Reject" → Application rejected, cannot login
5. **Manage Active Accounts**:
   - Click "Disable" → Temporarily block access
   - Click "Enable" → Restore access

## Account States

### Pending
- **Status**: Waiting for admin review
- **Can Login**: ❌ No
- **Message**: "Your psychologist application is under review"
- **Admin Actions**: Approve or Reject

### Approved
- **Status**: Active and working
- **Can Login**: ✅ Yes
- **Admin Actions**: Disable (temporarily block)

### Rejected
- **Status**: Application not approved
- **Can Login**: ❌ No
- **Message**: "Your psychologist application was not approved"
- **Admin Actions**: Approve (give second chance)

### Disabled
- **Status**: Temporarily blocked by admin
- **Can Login**: ❌ No
- **Message**: "Your account has been disabled"
- **Admin Actions**: Enable (restore access)

## Registration Flow

```
Psychologist visits /register/psychologist
              ↓
Fills out application form
              ↓
Submits application
              ↓
Account created with status: "pending"
              ↓
Success message: "Application Submitted!"
              ↓
Admin reviews in dashboard
              ↓
Admin clicks "Approve"
              ↓
Account status: "approved", isActive: true
              ↓
Psychologist can now login
              ↓
Access to psychologist dashboard
```

## Login Protection

When a psychologist tries to login:

**Pending Status:**
```json
{
  "success": false,
  "message": "Account pending approval",
  "errors": ["Your psychologist application is under review. You will receive an email once approved."]
}
```

**Rejected Status:**
```json
{
  "success": false,
  "message": "Application rejected",
  "errors": ["Your psychologist application was not approved. Please contact support for more information."]
}
```

**Disabled Status:**
```json
{
  "success": false,
  "message": "Account disabled",
  "errors": ["Your account has been disabled by an administrator. Please contact support for assistance."]
}
```

## Admin Dashboard Features

### Psychologists Tab Shows:
- Name
- Email
- Status (Pending/Active/Rejected/Disabled)
- Specializations
- Join Date
- Action Buttons

### Action Buttons:
- **Pending**: Approve | Reject
- **Approved**: Disable
- **Rejected**: Approve
- **Disabled**: Enable

## Two Ways to Create Psychologist Accounts

### 1. Admin-Created (Auto-Approved)
- Admin creates account via `/admin/create-psychologist`
- Status: Automatically "approved"
- isActive: Automatically `true`
- Can login immediately

### 2. Self-Registered (Requires Approval)
- Psychologist registers via `/register/psychologist`
- Status: "pending"
- isActive: `false`
- Must wait for admin approval

## API Endpoints

### Registration
```
POST /api/users/register
Body: {
  "name": "Dr. John Smith",
  "email": "john@example.com",
  "password": "password123",
  "role": "psychologist",
  "psychologistDetails": {
    "specializations": ["Anxiety", "Depression"],
    "experience": "5 years",
    "education": "PhD in Clinical Psychology",
    "bio": "Experienced therapist..."
  }
}
```

### Admin Approve
```
PUT /api/admin/psychologists/:id/approve
```

### Admin Reject
```
PUT /api/admin/psychologists/:id/reject
```

### Admin Toggle Status
```
PUT /api/admin/psychologists/:id/toggle-status
```

## Files Modified

### Backend:
- `server/routes/users.js` - Added psychologist registration logic
- `server/routes/admin.js` - Added approve/reject/toggle endpoints

### Frontend:
- `client/src/pages/PsychologistRegister.js` - New registration page
- `client/src/components/dashboards/AdminDashboard-new.js` - Updated with approval UI
- `client/src/App.js` - Added route for psychologist registration

## Next Steps

1. **Add Link to Landing Page**: Add "Join as Psychologist" button
2. **Email Notifications**: Send email when approved/rejected
3. **Application Details View**: Show full application in admin dashboard
4. **Bulk Actions**: Approve/reject multiple applications at once

## Testing

### Test Psychologist Registration:
1. Go to `/register/psychologist`
2. Fill out form
3. Submit
4. Try to login (should be blocked)
5. Login as admin
6. Go to Psychologists tab
7. See pending application
8. Click "Approve"
9. Logout and login as psychologist (should work now)

## Benefits

✅ **Scalable**: Therapists can join without admin creating each account
✅ **Quality Control**: Admin reviews before activation
✅ **Professional**: Proper application process
✅ **Flexible**: Admin can approve, reject, or disable accounts
✅ **Clear Status**: Users know exactly where they stand
