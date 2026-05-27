import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

function setAxiosAuthToken(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGIN_FAILURE':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return initialState;
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const persistedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && persistedUser?.User_ID) {
      setAxiosAuthToken(token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user: persistedUser,
        },
      });
    }
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, User_ID, Username, settings } = response.data.data;
      const userData = { User_ID, Username, Email: email, settings };

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setAxiosAuthToken(token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user: userData,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password,
      });
      const { token, User_ID, Username } = response.data.data;
      const userData = { User_ID, Username, Email: email };

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setAxiosAuthToken(token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user: userData,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setAxiosAuthToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
