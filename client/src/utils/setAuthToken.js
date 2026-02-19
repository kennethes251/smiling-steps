import axios from 'axios';

const setAuthToken = (token) => {
  if (token) {
    // Apply authorization token to every request if logged in
    // Set both headers for maximum compatibility
    axios.defaults.headers.common['x-auth-token'] = token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('🔐 Token set in axios defaults');
  } else {
    // Delete auth headers
    delete axios.defaults.headers.common['x-auth-token'];
    delete axios.defaults.headers.common['Authorization'];
    console.log('🔐 Token removed from axios defaults');
  }
};

export default setAuthToken;