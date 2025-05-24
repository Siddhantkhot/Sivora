import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const  useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on page load
    const checkLoggedIn = async () => {
      try {
        const userInfo = localStorage.getItem('userInfo');
        
        if (userInfo) {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
          
          // Set default Authorization header for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        }
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('userInfo');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Register user
  const register = async (username, email, password) => {
    try {
      setLoading(true);
      const { data } = await api.post('/api/auth/register', {
        username,
        email,
        password
      });

      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data } = await api.post('/api/auth/login', {
        email,
        password
      });

      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout API to update user status to offline
      if (user) {
        await api.post('/api/auth/logout');
      }
      
      localStorage.removeItem('userInfo');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still remove user from local state even if API call fails
      localStorage.removeItem('userInfo');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      console.log('Updating profile with data:', userData);
      
      // Make sure the auth token is included in the request
      const token = user?.token;
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      // Ensure the Authorization header is set
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const { data } = await api.put('/api/users/profile', userData);
      console.log('Profile update response:', data);
      
      // Update user in state and localStorage while preserving the token
      const updatedUser = { 
        ...user, 
        ...data,
        token: token // Explicitly preserve the token
      };
      
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error details:', error.response?.data);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
