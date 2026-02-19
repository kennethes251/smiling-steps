const jwt = require('jsonwebtoken');

// General authentication middleware
const auth = (req, res, next) => {
  // Get token from header - check both x-auth-token and Authorization Bearer
  let token = req.header('x-auth-token');
  
  // If no x-auth-token, check for Authorization Bearer
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  console.log('🔐 Auth middleware - Token received:', token ? 'Yes' : 'No');
  console.log('🔐 Auth middleware - Token length:', token?.length);

  // Check if not token
  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('✅ Auth middleware - Token valid for user:', decoded.user.id);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.log('❌ Auth middleware - Token invalid:', err.message);
    
    // Provide specific error messages
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Invalid token' });
    } else {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
  }
};

// Middleware to check for admin role
const admin = (req, res, next) => {
  // Assumes auth middleware has been run
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required' });
  }
  
  if (req.user.role === 'admin') {
    next();
  } else {
    console.log('❌ Admin access denied for user:', req.user.id, 'Role:', req.user.role);
    res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
  }
};

// Middleware to check for specific role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Authentication required' });
    }
    
    if (req.user.role === role) {
      next();
    } else {
      console.log(`❌ ${role} access denied for user:`, req.user.id, 'Role:', req.user.role);
      res.status(403).json({ msg: `Access denied. ${role} privileges required.` });
    }
  };
};

// Middleware to check for multiple allowed roles
const requireAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Authentication required' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      console.log(`❌ Role access denied for user:`, req.user.id, 'Role:', req.user.role, 'Required:', roles);
      res.status(403).json({ msg: `Access denied. Required roles: ${roles.join(', ')}` });
    }
  };
};

// Note: For more robust role-based access control with database verification,
// use the middleware from './roleAuth.js' instead of requireRole/requireAnyRole here.
// The roleAuth.js middleware fetches fresh user data and checks account status.

module.exports = { auth, admin, requireRole, requireAnyRole };
