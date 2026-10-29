import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { User } from '../../shared/types.js';
import { Smartphone, Lock, User as UserIcon, Mail, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [countryCode, setCountryCode] = useState('+91');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      error('Validation Error', 'Please enter your full name (at least 2 characters).');
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      error('Validation Error', 'Mobile number is required.');
      return;
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (countryCode === '+91') {
      const isValidIndian =
        digitsOnly.length === 10 ||
        (digitsOnly.length === 11 && digitsOnly.startsWith('0')) ||
        (digitsOnly.length === 12 && digitsOnly.startsWith('91'));
      if (!isValidIndian) {
        error('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
        return;
      }
    } else if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      error('Invalid Mobile Number', 'Please enter a valid phone number (7 to 15 digits).');
      return;
    }

    if (password.length < 6) {
      error('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      error('Password Mismatch', 'Passwords do not match. Please verify your password.');
      return;
    }

    if (!agreeTerms) {
      error('Terms Required', 'You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    try {
      setLoading(true);
      let fullPhone = trimmedPhone.replace(/[\s\-()]/g, '');
      if (!fullPhone.startsWith('+')) {
        if (fullPhone.startsWith('0') && fullPhone.length === 11) {
          fullPhone = `${countryCode}${fullPhone.slice(1)}`;
        } else if (fullPhone.startsWith('91') && fullPhone.length === 12) {
          fullPhone = `+${fullPhone}`;
        } else {
          fullPhone = `${countryCode}${fullPhone}`;
        }
      }

      const data = await api.post<{ message: string; user: User; token: string }>('/auth/register', {
        name: trimmedName,
        phone: fullPhone,
        email: email.trim() || undefined,
        password,
        confirmPassword,
        agreeTerms,
      });

      login(data.token, data.user);
      success('Account Created', 'Welcome to SmartGov Connect AI! You can now file grievances.');
      navigate('/dashboard');
    } catch (err: any) {
      error('Registration Failed', err.message || 'Unable to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl items-center justify-center shadow-lg shadow-indigo-500/25">
            SG
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Register Citizen Account</h2>
          <p className="text-xs text-slate-500">
            Create your profile to submit civic grievances, receive live SMS/in-app updates, and track resolutions.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
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
                    placeholder="e.g. 9123456780"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Enter a 10-digit mobile number</p>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Agree Terms */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  required
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I agree to the <span className="text-indigo-600 font-semibold">Terms of Service</span> and{' '}
                  <span className="text-indigo-600 font-semibold">Privacy Policy</span>. I consent to receiving grievance status notifications.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Register & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:text-indigo-700 font-bold"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
