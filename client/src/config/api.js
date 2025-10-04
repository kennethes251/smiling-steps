// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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