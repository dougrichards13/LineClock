import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { authAPI } from '../services/api';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.getAuthUrl();
      const { authUrl } = response.data.data;
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">LineClock</h1>
          <p className="mt-2 text-sm text-gray-600">Professional Time Tracking & Project Management</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Sign In</h2>
            <p className="mt-1 text-sm text-gray-600">Access your account using your organization credentials</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 0C4.7 0 0 4.7 0 10.5S4.7 21 10.5 21 21 16.3 21 10.5 16.3 0 10.5 0zm0 19.2c-4.8 0-8.7-3.9-8.7-8.7S5.7 1.8 10.5 1.8s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" fill="currentColor"/>
              <path d="M14.7 10.5h-4.2V6.3h-1.4v4.2H5.3v1.4h4.2v4.2h1.4v-4.2h4.2v-1.4z" fill="currentColor"/>
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>

          <div className="text-xs text-gray-500 text-center">
            Secure authentication powered by Microsoft Entra ID
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          Consulting Excellence Through Technology
        </p>
      </div>
    </div>
  );
};

export default Login;
