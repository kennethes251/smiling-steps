// API Configuration
// Detect environment and set appropriate API URL
const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname.includes('netlify');
const isDevelopment = window.location.hostname === 'localhost';

let API_BASE_URL;

if (isProduction) {
  API_BASE_URL = 'https://smiling-steps-backend.onrender.com';
} else if (isDevelopment) {
  API_BASE_URL = 'http://localhost:5000';
} else {
  // Fallback to Render for any other case
  API_BASE_URL = 'https://smiling-steps-backend.onrender.com';
}

console.log('🌐 API Configuration:', {
  hostname: window.location.hostname,
  isProduction,
  isDevelopment,
  API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL
});

// Helper function to get full API URL
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  AUTH: `${API_BASE_URL}/api/auth`,
  USERS: `${API_BASE_URL}/api/users`,
  SESSIONS: `${API_BASE_URL}/api/sessions`,
  PSYCHOLOGISTS: `${API_BASE_URL}/api/public/psychologists`,
  COMPANY: `${API_BASE_URL}/api/company`,
  UPLOAD: `${API_BASE_URL}/api/upload`,
  ADMIN: `${API_BASE_URL}/api/admin`
};

export default API_BASE_URL;