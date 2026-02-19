// API Configuration
// Environment-based API URL configuration with proper fallbacks
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '0.0.0.0';

const isRenderFrontend = window.location.hostname.includes('smiling-steps-frontend.onrender.com');

let API_BASE_URL;

// Priority: Environment variable > Auto-detection > Fallback
if (process.env.REACT_APP_API_URL) {
  API_BASE_URL = process.env.REACT_APP_API_URL;
} else if (isLocalhost) {
  // Local development - use local backend
  API_BASE_URL = 'http://localhost:5000';
} else {
  // Production on Render - use production backend
  API_BASE_URL = 'https://smiling-steps-backend.onrender.com';
}

// Only log in development to avoid exposing info in production
if (process.env.NODE_ENV !== 'production') {
  console.log('🌐 API Configuration:', {
    hostname: window.location.hostname,
    isLocalhost,
    isRenderFrontend,
    API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });
}

// Helper function to get full API URL
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

// Centralized API endpoints configuration
export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  AUTH: `${API_BASE_URL}/api/auth`,
  USERS: `${API_BASE_URL}/api/users`,
  SESSIONS: `${API_BASE_URL}/api/sessions`,
  PSYCHOLOGISTS: `${API_BASE_URL}/api/public/psychologists`,
  COMPANY: `${API_BASE_URL}/api/company`,
  UPLOAD: `${API_BASE_URL}/api/upload`,
  ADMIN: `${API_BASE_URL}/api/admin`,
  RESOURCES: `${API_BASE_URL}/api/resources`,
  MPESA: `${API_BASE_URL}/api/mpesa`,
  VIDEO_CALLS: `${API_BASE_URL}/api/video-calls`,
  HEALTH: `${API_BASE_URL}/health`
};

// API request configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
};

export default API_BASE_URL;