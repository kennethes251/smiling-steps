// Authentication utility functions

export const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return {
    headers: {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    }
  };
};

export const getAuthConfigForFormData = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return {
    headers: {
      'x-auth-token': token,
      'Content-Type': 'multipart/form-data'
    }
  };
};

export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Basic token validation - check if it's not expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
};

export const refreshTokenIfNeeded = async () => {
  if (!isTokenValid()) {
    clearAuthToken();
    window.location.href = '/login';
    return false;
  }
  return true;
};