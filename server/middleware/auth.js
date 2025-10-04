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
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Middleware to check for admin role
const admin = (req, res, next) => {
  // Assumes auth middleware has been run
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, admin };
