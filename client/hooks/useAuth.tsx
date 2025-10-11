import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  name: string;
  email: string;
  role: string;
  authType: string;
  sessionId?: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('adminToken');
    const userString = localStorage.getItem('adminUser');
    
    if (token && userString) {
      try {
        const userData = JSON.parse(userString);
        setIsAuthenticated(true);
        setUser(userData);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        // Clear invalid data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      const token = localStorage.getItem('adminToken');
      if (token) {
        await fetch('/api/auth/admin-logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      // Update state
      setIsAuthenticated(false);
      setUser(null);
      
      // Redirect to login
      navigate('/admin/login');
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    logout,
    checkAuthStatus
  };
};
