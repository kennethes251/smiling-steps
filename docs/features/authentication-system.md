# Authentication System

*Comprehensive guide for the authentication and authorization system in Smiling Steps*

## ✅ Current Status: STABLE - DO NOT MODIFY

**Last Updated**: December 28, 2025  
**Status**: ✅ **STABLE** - Fully tested and production-ready  
**Priority**: Critical - Core system functionality

⚠️ **IMPORTANT**: This system is marked as STABLE. Do not modify without explicit user instruction.

---

## 📋 Overview

The authentication system provides secure user registration, login, email verification, and role-based access control for the Smiling Steps platform. It supports three user roles: Client, Psychologist, and Admin.

### Key Features
- **Multi-role Registration**: Client, Psychologist, and Admin registration
- **Email Verification**: Secure email verification with token-based system
- **JWT Authentication**: Stateless authentication with refresh tokens
- **Role-based Access Control**: Granular permissions by user role
- **Psychologist Approval Workflow**: Admin approval process for psychologists
- **Password Security**: Bcrypt hashing with configurable rounds
- **Account Management**: Password reset, account locking, and recovery

---

## 🏗️ Architecture

### Core Components (PROTECTED - DO NOT MODIFY)
1. **Main Login Route** (`server/routes/users-mongodb-fixed.js`) - **THE ACTUAL FILE USED**
2. **Auth Routes** (`server/routes/auth.js`) - Token refresh and auth check
3. **Email Verification Service** (`server/services/emailVerificationService.js`)
4. **Frontend Auth Context** (`client/src/context/AuthContext.js`)
5. **Role Guard Component** (`client/src/components/RoleGuard.js`)

### Stable Test File
- `server/test/auth-login.stable.test.js` - **DO NOT MODIFY**

### Database Models
```javascript
// User Model (MongoDB)
{
  _id: ObjectId,
  name: String,
  email: String, // Unique index
  password: String, // Bcrypt hashed
  role: String, // 'client', 'psychologist', 'admin'
  isVerified: Boolean, // Email verification status
  isEmailVerified: Boolean, // Compatibility field
  approvalStatus: String, // 'pending', 'approved', 'rejected' (psychologists only)
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date,
  
  // Psychologist-specific fields
  psychologistDetails: {
    licenseNumber: String,
    specializations: [String],
    approvalStatus: String, // Legacy field
    bio: String,
    hourlyRate: Number
  },
  
  // Security fields
  loginAttempts: Number,
  lockUntil: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}
```

---

## 🔒 Critical Implementation Details (STABLE)

### 1. Login Response Format
**MUST include `approvalStatus` field**:
```javascript
const userData = {
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  lastLogin: user.lastLogin,
  isVerified: user.isVerified,
  approvalStatus: user.role === 'psychologist' 
    ? (user.approvalStatus || user.psychologistDetails?.approvalStatus || 'pending')
    : 'not_applicable'
};
```

### 2. Email Verification Logic
- **Clients and Psychologists**: MUST have `isVerified: true` to login
- **Admins**: Bypass verification check
- **Compatibility**: Check BOTH `isVerified` AND `isEmailVerified` fields

### 3. Psychologist Approval Flow
- New psychologists start with `approvalStatus: 'pending'`
- Admin approves via dashboard → sets `approvalStatus: 'approved'`
- RoleGuard shows pending page if `approvalStatus !== 'approved'`

### 4. Route Registration
- Server uses `users-mongodb-fixed.js` NOT `users-mongodb.js`
- Registered in `server/index.js` around line 132

---

## 💻 API Endpoints

### Authentication Endpoints

#### User Registration
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "role": "client", // or "psychologist"
  "licenseNumber": "PSY12345" // Required for psychologists
}

Response:
{
  "message": "Registration successful. Please check your email for verification.",
  "userId": "user-id-here"
}
```

#### User Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client",
    "isVerified": true,
    "approvalStatus": "not_applicable",
    "lastLogin": "2026-01-08T19:52:00.000Z"
  }
}
```

#### Email Verification
```http
POST /api/email-verification/verify
Content-Type: application/json

{
  "token": "verification-token-here"
}

Response:
{
  "message": "Email verified successfully"
}
```

#### Token Refresh
```http
POST /api/auth/refresh
Authorization: Bearer <jwt-token>

Response:
{
  "token": "new-jwt-token-here"
}
```

---

## 🔐 Security Features

### Password Security
```javascript
// Password hashing (in User model)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Password validation
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

### JWT Configuration
```javascript
// JWT token generation
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Token verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Account Security
- **Rate Limiting**: Prevent brute force attacks
- **Account Locking**: Lock accounts after failed attempts
- **Secure Tokens**: Cryptographically secure verification tokens
- **Password Requirements**: Minimum complexity requirements

---

## 👥 Role-Based Access Control

### Role Definitions
```javascript
const ROLES = {
  CLIENT: 'client',
  PSYCHOLOGIST: 'psychologist', 
  ADMIN: 'admin'
};

const ROLE_PERMISSIONS = {
  [ROLES.CLIENT]: [
    'book_sessions',
    'view_own_sessions',
    'take_assessments',
    'view_resources'
  ],
  [ROLES.PSYCHOLOGIST]: [
    'view_assigned_sessions',
    'manage_availability',
    'view_earnings',
    'access_client_notes'
  ],
  [ROLES.ADMIN]: [
    'manage_users',
    'approve_psychologists',
    'view_all_sessions',
    'manage_content',
    'view_analytics'
  ]
};
```

### Role Guard Component (PROTECTED)
```jsx
// client/src/components/RoleGuard.js - DO NOT MODIFY
const RoleGuard = ({ children, allowedRoles, requireApproval = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  // Check psychologist approval status
  if (requireApproval && user.role === 'psychologist' && user.approvalStatus !== 'approved') {
    return <PendingApprovalPage />;
  }
  
  return children;
};
```

### Route Protection Examples
```jsx
// Protect admin routes
<Route path="/admin/*" element={
  <RoleGuard allowedRoles={['admin']}>
    <AdminDashboard />
  </RoleGuard>
} />

// Protect psychologist routes with approval check
<Route path="/psychologist/*" element={
  <RoleGuard allowedRoles={['psychologist']} requireApproval={true}>
    <PsychologistDashboard />
  </RoleGuard>
} />
```

---

## 📧 Email Verification System

### Verification Flow
1. User registers → Verification email sent
2. User clicks email link → Token verified
3. Account marked as verified → User can login

### Email Service Integration
```javascript
// Email verification service (PROTECTED)
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  
  const emailContent = {
    to: user.email,
    subject: 'Verify Your Smiling Steps Account',
    html: `
      <h2>Welcome to Smiling Steps!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  };
  
  await emailService.sendEmail(emailContent);
};
```

---

## 🧪 Testing (STABLE - DO NOT MODIFY)

### Stable Test File
`server/test/auth-login.stable.test.js` contains comprehensive tests that MUST NOT be modified:

- User registration flow
- Email verification process
- Login with various scenarios
- Role-based access control
- Psychologist approval workflow
- Token generation and validation
- Error handling and edge cases

### Running Stable Tests
```bash
# Run only stable authentication tests
npm test -- --testPathPattern="auth-login.stable"

# These tests MUST pass before any deployment
```

---

## 🔧 Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Client Configuration
CLIENT_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ACCOUNT_LOCK_TIME=1800000
MAX_LOGIN_ATTEMPTS=5
```

---

## 🚨 Troubleshooting

### Common Issues

#### Login Failures
1. **Check email verification status**
2. **Verify password correctness**
3. **Check account lock status**
4. **Validate JWT secret configuration**

#### Email Verification Issues
1. **Check email service configuration**
2. **Verify SMTP credentials**
3. **Check spam/junk folders**
4. **Validate token expiration**

#### Role Access Issues
1. **Verify user role assignment**
2. **Check psychologist approval status**
3. **Validate route protection configuration**

### Debug Commands
```bash
# Test authentication flow
node scripts/debug/test-auth-flow.js

# Check user status
node scripts/debug/check-user-status.js --email=user@example.com

# Reset user password
node scripts/maintenance/reset-user-password.js --email=user@example.com
```

---

## 📊 Monitoring & Analytics

### Authentication Metrics
- Registration success/failure rates
- Email verification completion rates
- Login success/failure rates
- Account lockout frequency
- Role distribution statistics

### Security Monitoring
- Failed login attempts
- Suspicious activity patterns
- Token usage patterns
- Account creation trends

---

## 🚀 Deployment Considerations

### Pre-deployment Checklist
- [ ] Run stable tests: `npm test -- --testPathPattern="auth-login.stable"`
- [ ] Verify environment variables
- [ ] Test email service connectivity
- [ ] Validate JWT secret security
- [ ] Check database indexes

### Production Security
- Use strong JWT secrets (minimum 32 characters)
- Enable HTTPS for all authentication endpoints
- Configure proper CORS settings
- Set up monitoring and alerting
- Regular security audits

---

## ⚠️ STABILITY WARNINGS

### DO NOT MODIFY
The following files are STABLE and must not be modified:
- `server/routes/users-mongodb-fixed.js`
- `server/routes/auth.js`
- `server/services/emailVerificationService.js`
- `client/src/context/AuthContext.js`
- `client/src/components/RoleGuard.js`
- `server/test/auth-login.stable.test.js`

### Before Making Changes
1. Check if file is in protected list
2. Run stable tests to ensure no regression
3. Get explicit user approval for modifications
4. Document any changes thoroughly

---

## 📞 Support & Maintenance

### Regular Maintenance
- **Weekly**: Review authentication logs
- **Monthly**: Security audit and updates
- **Quarterly**: Performance optimization review

### Emergency Procedures
- Account lockout resolution
- Password reset for critical accounts
- Token revocation procedures
- Security incident response

---

*This authentication system is production-ready and has been thoroughly tested. Any modifications must be approved and tested to maintain system stability.*