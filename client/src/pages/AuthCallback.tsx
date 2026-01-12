import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { authAPI } from '../services/api';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || 'Authentication failed');
          setProcessing(false);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setProcessing(false);
          return;
        }

        // Exchange code for token with backend
        const response = await authAPI.handleCallback(code);
        const { token, user } = response.data.data;

        // Store auth data and redirect to dashboard
        login(token, user);
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.response?.data?.error || 'Failed to complete authentication');
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {processing ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Completing sign-in...</h2>
            <p className="mt-2 text-sm text-gray-600">Please wait while we authenticate you</p>
          </div>
        ) : error ? (
          <div>
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Authentication Failed</h2>
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AuthCallback;
