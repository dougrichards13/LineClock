import React, { useState } from 'react';
import { authAPI } from '../services/api';
import Footer from '../components/Footer';
import LiveClock from '../components/LiveClock';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated manufacturing line - diagonal time icons */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute w-full h-full" style={{ transform: 'rotate(-15deg) scale(1.5)' }}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white animate-slide-diagonal"
              style={{
                left: `${(i * 15) - 20}%`,
                top: `${(i * 10) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: '20s'
              }}
            >
              {i % 4 === 0 ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              ) : i % 4 === 1 ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              ) : i % 4 === 2 ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <LiveClock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight">
              LineClock™
            </h1>
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-3 w-32 mx-auto"></div>
          </div>
          <p className="mt-6 text-xl text-gray-300 font-medium">Time Tracking. Reimagined.</p>
          <p className="mt-2 text-sm text-gray-400">by Smart Factory</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="mt-1 text-sm text-gray-400">Sign in with your Microsoft account to continue</p>
          </div>

          {error && (
            <div className="text-sm text-red-200 bg-red-900/50 p-3 rounded-lg border border-red-800">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full group relative flex justify-center items-center gap-3 py-4 px-6 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-800 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg className="w-6 h-6" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h10.8v10.8H0V0z" fill="#f25022"/>
              <path d="M12.1 0H22.9v10.8H12.1V0z" fill="#00a4ef"/>
              <path d="M0 12.1h10.8V22.9H0V12.1z" fill="#7fba00"/>
              <path d="M12.1 12.1H22.9V22.9H12.1V12.1z" fill="#ffb900"/>
            </svg>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign in with Microsoft'}
          </button>

          <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured by Microsoft Entra ID
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            Need help? Contact us at{' '}
            <a href="mailto:contact@smartfactory.io" className="text-indigo-400 hover:text-purple-400 transition-colors">
              contact@smartfactory.io
            </a>
          </p>
        </div>
      </div>

      {/* Footer at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <Footer />
      </div>

      <style>{`
        @keyframes slide-diagonal {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(100vw, 50vh);
            opacity: 0;
          }
        }
        .animate-slide-diagonal {
          animation: slide-diagonal linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
