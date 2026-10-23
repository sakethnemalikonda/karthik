import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { User } from '../../shared/types.js';
import { Smartphone, Lock, ArrowRight, Shield, User as UserIcon, Loader2 } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const { success, error, info } = useToast();

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      error('Please enter both mobile number and password.');
      return;
    }

    try {
      setLoading(true);
      const fullPhone = phone.startsWith('+') ? phone.trim() : `${countryCode}${phone.trim()}`;
      const data = await api.post<{ message: string; user: User; token: string }>('/auth/login', {
        phone: fullPhone,
        password,
      });

      login(data.token, data.user);
      success('Welcome back', `Logged in as ${data.user.name}.`);

      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      error('Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCitizen = () => {
    setCountryCode('+91');
    setPhone('9876543211');
    setPassword('Citizen@12345');
    info('Demo Citizen Filled', 'Priya Sharma (+919876543211)');
  };

  const fillDemoAdmin = () => {
    setCountryCode('+91');
    setPhone('9876543210');
    setPassword('Admin@12345');
    info('Demo Admin Filled', 'Chief Administrator (+919876543210)');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullPhone = forgotPhone.startsWith('+') ? forgotPhone.trim() : `${countryCode}${forgotPhone.trim()}`;
      const res = await api.post<{ message: string }>('/auth/forgot-password', { phone: fullPhone });
      info('Password Reset', res.message);
      setForgotModalOpen(false);
    } catch (err: any) {
      error('Reset failed', err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl items-center justify-center shadow-lg shadow-indigo-500/25">
            SG
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Citizen & Admin Sign In</h2>
          <p className="text-xs text-slate-500">Access your registered grievance dashboard with your mobile number</p>
        </div>

        {/* Demo Fast Login Shortcuts Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200/80 space-y-2 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              Evaluation Demo Accounts
            </span>
            <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold">
              1-Click Autofill
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoCitizen}
              className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-indigo-200 text-left text-xs transition-all shadow-xs flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Demo Citizen</p>
                <p className="text-[10px] text-slate-500">Priya Sharma</p>
              </div>
            </button>

            <button
              type="button"
              onClick={fillDemoAdmin}
              className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-indigo-200 text-left text-xs transition-all shadow-xs flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Administrator</p>
                <p className="text-[10px] text-slate-500">Full Privileges</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In to SmartGov
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-indigo-600 hover:text-indigo-700 font-bold"
            >
              Register here
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Simulation Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
            <p className="text-xs text-slate-500">
              Enter your registered mobile number to receive demo reset instructions.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="tel"
                placeholder="Mobile number..."
                value={forgotPhone}
                onChange={(e) => setForgotPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
