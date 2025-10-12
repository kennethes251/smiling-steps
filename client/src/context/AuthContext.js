import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import setAuthToken from '../utils/setAuthToken';

// Initial State
const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  user: null,
  error: null,
  pendingVerification: false,
  verificationMessage: null
};

// Create Context
export const AuthContext = createContext(initialState);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Reducer
const authReducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload,
        error: null
      };
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', payload.token);
      setAuthToken(payload.token);
      return {
        ...state,
        token: payload.token,
        isAuthenticated: true,
        loading: false,
        user: payload.user,
        error: null
      };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', payload.token);
      setAuthToken(payload.token);
      return {
        ...state,
        token: payload.token,
        isAuthenticated: true,
        loading: false,
        user: payload.user,
        error: null
      };
    case 'REGISTER_PENDING_VERIFICATION':
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: null,
        pendingVerification: true,
        verificationMessage: payload.message
      };
    case 'REGISTER_FAIL':
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      setAuthToken(null);
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: payload
      };
    default:
      return state;
  }
};

// Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user if token exists on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          setAuthToken(token);
          try {
            const res = await axios.get('https://smiling-steps.onrender.com/api/auth');
            dispatch({ 
              type: 'USER_LOADED', 
              payload: res.data 
            });
          } catch (err) {
            console.error('Failed to load user:', err);
            dispatch({ 
              type: 'AUTH_ERROR',
              payload: 'Failed to load user session'
            });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch({ 
          type: 'AUTH_ERROR',
          payload: 'Error initializing authentication'
        });
      }
    };
    
    initializeAuth();
  }, []);

  // Register User
  const register = async (userData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const res = await axios.post(
        'https://smiling-steps.onrender.com/api/users/register', 
        userData,
        config
      );
      
      console.log('Registration successful:', res.data);
      
      // Check if email verification is required
      if (res.data.requiresVerification) {
        // Don't set as authenticated yet, user needs to verify email
        dispatch({ type: 'REGISTER_PENDING_VERIFICATION', payload: res.data });
        return res.data;
      } else {
        // Streamlined registration or pre-approved accounts
        // User is immediately authenticated with token
        if (res.data.token) {
          dispatch({ type: 'REGISTER_SUCCESS', payload: res.data });
        } else {
          // Fallback for cases where token might not be provided
          dispatch({ type: 'REGISTER_PENDING_VERIFICATION', payload: res.data });
        }
        return res.data;
      }
    } catch (err) {
      console.error('Registration error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      // Get specific error message from backend
      let errorMsg = 'Registration failed';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        errorMsg = err.response.data.errors[0];
      } else if (err.response?.data?.msg) {
        errorMsg = err.response.data.msg;
      }
      
      dispatch({ type: 'REGISTER_FAIL', payload: errorMsg });
      throw new Error(errorMsg);
    }
  };

  // Login User
  const login = async (email, password) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const res = await axios.post(
        'https://smiling-steps.onrender.com/api/users/login', 
        { email, password }, 
        config
      );
      
      console.log('Login successful:', { 
        user: res.data.user ? 'User data received' : 'No user data',
        token: res.data.token ? 'Token received' : 'No token'
      });
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      return res.data;
    } catch (err) {
      console.error('Login error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          data: err.config?.data
        }
      });
      
      const errorMsg = err.response?.data?.msg || 'Login failed. Please check your credentials and try again.';
      dispatch({ type: 'LOGIN_FAIL', payload: errorMsg });
      throw new Error(errorMsg);
    }
  };

  // Check if user is already logged in (on app load)
  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return null;
      }
      
      setAuthToken(token);
      
      try {
        const userRes = await axios.get('https://smiling-steps.onrender.com/api/auth');
        const userData = userRes.data;
        
        // If we got user data, consider the login successful
        if (userData && userData.id) {
          dispatch({
            type: 'USER_LOADED',
            payload: userData
          });
          return userData;
        }
        
        throw new Error('No user data available');
      } catch (userErr) {
        console.error('AuthContext: Error in session-based auth:', userErr);
        // Clear invalid token
        localStorage.removeItem('token');
        setAuthToken(null);
        return null;
      }
    } catch (error) {
      console.error('AuthContext: Error in loadUser:', error);
      // Clear token on error
      localStorage.removeItem('token');
      setAuthToken(null);
      
      // Reset auth state
      dispatch({
        type: 'AUTH_ERROR'
      });
      
      return null;
    }
  };

  // Update User
  const updateUser = (updatedUserData) => {
    dispatch({ 
      type: 'USER_LOADED', 
      payload: updatedUserData 
    });
  };

  // Logout User
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        error: state.error,
        register,
        login,
        logout,
        loadUser,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
