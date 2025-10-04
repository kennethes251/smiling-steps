import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if user is logged in on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set auth token header
      axios.defaults.headers.common['x-auth-token'] = token;
      // Fetch user data
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Load user data
  const loadUser = async () => {
    try {
      const res = await axios.get(`${API_ENDPOINTS.AUTH}/me`);
      setUser(res.data);
    } catch (err) {
      console.error('Error loading user:', err);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['x-auth-token'];
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      const res = await axios.post(`${API_ENDPOINTS.AUTH}/register`, userData);
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      setUser(res.data.user);
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_ENDPOINTS.AUTH}/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      setUser(res.data.user);
      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['x-auth-token'];
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
