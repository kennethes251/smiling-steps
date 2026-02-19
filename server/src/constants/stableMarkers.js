/**
 * STABLE MARKERS - Authentication System
 * 
 * @stable - These features are verified working and MUST NOT be modified
 *           without explicit user instruction and thorough testing.
 * 
 * Last verified: December 28, 2025
 * Verified by: User manual testing
 */

const STABLE_FEATURES = {
  // ============================================
  // AUTHENTICATION SYSTEM - VERIFIED STABLE
  // ============================================
  
  CLIENT_REGISTRATION: {
    status: 'STABLE',
    verifiedDate: '2025-12-28',
    description: 'Client registration with email verification',
    files: [
      'server/routes/users-mongodb-fixed.js',
      'server/services/emailVerificationService.js',
      'client/src/pages/Register.js'
    ],
    flow: [
      '1. User fills registration form',
      '2. Account created with isVerified: false',
      '3. Verification email sent',
      '4. User clicks email link',
      '5. isVerified set to true',
      '6. User can login'
    ]
  },

  CLIENT_LOGIN: {
    status: 'STABLE',
    verifiedDate: '2025-12-28',
    description: 'Client login with email verification check',
    files: [
      'server/routes/users-mongodb-fixed.js',
      'server/routes/auth.js',
      'client/src/context/AuthContext.js',
      'client/src/components/auth/Login.js'
    ],
    criticalFields: ['isVerified'],
    flow: [
      '1. User enters credentials',
      '2. Backend validates password',
      '3. Backend checks isVerified === true',
      '4. JWT token returned with user data',
      '5. Frontend stores token and user in AuthContext',
      '6. User redirected to dashboard'
    ]
  },

  PSYCHOLOGIST_REGISTRATION: {
    status: 'STABLE',
    verifiedDate: '2025-12-28',
    description: 'Psychologist registration with email verification and approval workflow',
    files: [
      'server/routes/users-mongodb-fixed.js',
      'server/services/emailVerificationService.js',
      'client/src/pages/PsychologistRegister.js'
    ],
    flow: [
      '1. Psychologist fills registration form',
      '2. Account created with isVerified: false, approvalStatus: pending',
      '3. Verification email sent',
      '4. User clicks email link',
      '5. isVerified set to true',
      '6. Admin approves account (approvalStatus: approved)',
      '7. Psychologist can login and access dashboard'
    ]
  },

  PSYCHOLOGIST_LOGIN: {
    status: 'STABLE',
    verifiedDate: '2025-12-28',
    description: 'Psychologist login with approval status check',
    files: [
      'server/routes/users-mongodb-fixed.js',
      'server/routes/auth.js',
      'client/src/context/AuthContext.js',
      'client/src/components/RoleGuard.js'
    ],
    criticalFields: ['isVerified', 'approvalStatus'],
    criticalLogic: [
      'Login response MUST include approvalStatus field',
      'GET /api/auth MUST return approvalStatus field',
      'RoleGuard checks user.approvalStatus !== "approved" to show pending page'
    ],
    flow: [
      '1. Psychologist enters credentials',
      '2. Backend validates password',
      '3. Backend checks isVerified === true',
      '4. Backend checks approvalStatus === approved',
      '5. JWT token returned with user data INCLUDING approvalStatus',
      '6. Frontend stores token and user in AuthContext',
      '7. RoleGuard checks approvalStatus before showing dashboard'
    ]
  },

  ADMIN_APPROVAL_WORKFLOW: {
    status: 'STABLE',
    verifiedDate: '2025-12-28',
    description: 'Admin can approve/reject psychologist accounts',
    files: [
      'server/routes/admin.js',
      'client/src/components/dashboards/AdminDashboard.js'
    ],
    flow: [
      '1. Admin views pending psychologists',
      '2. Admin clicks approve/reject',
      '3. Backend updates approvalStatus',
      '4. Psychologist can now login (if approved)'
    ]
  }
};

/**
 * CRITICAL: Do not modify these response structures
 * They are depended upon by the frontend
 */
const STABLE_API_RESPONSES = {
  LOGIN_SUCCESS: {
    endpoint: 'POST /api/users/login',
    requiredFields: ['success', 'token', 'user'],
    userFields: ['id', 'name', 'email', 'role', 'isVerified', 'approvalStatus'],
    note: 'approvalStatus MUST be included for psychologists'
  },
  
  AUTH_USER: {
    endpoint: 'GET /api/auth',
    requiredFields: ['id', 'name', 'email', 'role', 'isVerified', 'approvalStatus'],
    note: 'approvalStatus MUST be included for psychologists'
  },
  
  TOKEN_REFRESH: {
    endpoint: 'POST /api/auth/refresh',
    requiredFields: ['success', 'token', 'user'],
    userFields: ['id', 'name', 'email', 'role', 'isVerified', 'approvalStatus'],
    note: 'approvalStatus MUST be included for psychologists'
  }
};

/**
 * Files that should NOT be modified without careful review
 */
const PROTECTED_FILES = [
  'server/routes/users-mongodb-fixed.js',  // Main login/register routes
  'server/routes/auth.js',                  // Auth token routes
  'server/services/emailVerificationService.js', // Email verification
  'client/src/context/AuthContext.js',      // Frontend auth state
  'client/src/components/RoleGuard.js',     // Role-based access control
  'server/models/User.js'                   // User model schema
];

module.exports = {
  STABLE_FEATURES,
  STABLE_API_RESPONSES,
  PROTECTED_FILES
};
