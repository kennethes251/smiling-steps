import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import setAuthToken from '../utils/setAuthToken';
import API_BASE_URL from '../config/api';

// Initial State
const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  user: null,
  error: null
};

// Create Context
export const AuthContext = createContext(initialState);

// Reducer
const authReducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: payload
      };
    case 'REGISTER_SUCCESS':
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', payload.token);
      setAuthToken(payload.token);
      return {
        ...state,
        ...payload,
        isAuthenticated: true,
        loading: false
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

  // Load user if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (localStorage.token) {
        setAuthToken(localStorage.token);
        try {
          const res = await axios.get(`${API_BASE_URL}/api/auth`);
          dispatch({ type: 'USER_LOADED', payload: res.data });
        } catch (err) {
          dispatch({ type: 'AUTH_ERROR' });
        }
      }
    };
    loadUser();
  }, []);

  // Register User
  const register = async (formData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/register`, formData);
      dispatch({ type: 'REGISTER_SUCCESS', payload: res.data });
      return res.data;
    } catch (err) {
      dispatch({ type: 'REGISTER_FAIL', payload: err.response.data.msg });
      throw err;
    }
  };

  // Login User
  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login...');
      const res = await axios.post(`${API_BASE_URL}/api/users/login`, { email, password });
      console.log('AuthContext: Server response:', res.data);
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }

      // Set the token in localStorage and axios headers
      localStorage.setItem('token', res.data.token);
      setAuthToken(res.data.token);

      // Load user data immediately after login
      try {
        const userRes = await axios.get(`${API_BASE_URL}/api/auth`);
        console.log('AuthContext: User data loaded:', userRes.data);
        
        // Dispatch both login success and user loaded actions
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { 
            token: res.data.token,
            user: userRes.data
          } 
        });
        
        return userRes.data;
      } catch (userErr) {
        console.error('AuthContext: Error loading user data:', userErr);
        // Clear token if user data couldn't be loaded
        localStorage.removeItem('token');
        setAuthToken(null);
        throw new Error('Failed to load user data');
      }
    } catch (err) {
      console.error('AuthContext: Login error:', err);
      const errorMessage = err.response?.data?.msg || err.message || 'Login failed';
      dispatch({ 
        type: 'LOGIN_FAIL', 
        payload: errorMessage 
      });
      throw new Error(errorMessage);
    }
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
