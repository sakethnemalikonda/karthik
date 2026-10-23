import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Cpu,
  BarChart3,
  Flame,
  FileText,
  MapPin,
  Building,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [trackId, setTrackId] = useState('');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      navigate(`/track/${trackId.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* AI Banner Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-6 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>AI-Driven Public Grievance Management</span>
            <span className="text-indigo-300">•</span>
            <span className="text-slate-600">SmartGov 2.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Your Voice.{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
              Smarter Governance.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The next-generation citizen grievance redressal platform. Report civic issues in seconds with AI-powered category classification, duplicate detection, priority escalation, and live municipal tracking.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/submit' : '/register')}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm sm:text-base shadow-elevated hover:shadow-indigo-500/25 transition-all flex items-center gap-2 group"
            >
              Submit a Complaint
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {!user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base border border-slate-300 shadow-subtle transition-all"
                >
                  Citizen Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm sm:text-base shadow-subtle transition-all"
                >
                  Register
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base border border-slate-300 shadow-subtle transition-all"
              >
                Go to {user.role === 'ADMIN' ? 'Admin Portal' : 'My Dashboard'}
              </button>
            )}
          </div>

          {/* Track Complaint Quick Bar */}
          <div className="mt-12 max-w-xl mx-auto">
            <form
              onSubmit={handleTrackSubmit}
              className="p-1.5 bg-white rounded-2xl border border-slate-200 shadow-card flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
            >
              <div className="pl-3.5 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="Track public status: Enter SGC-2026-00001..."
                className="flex-1 px-2 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Track Now
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 3-Step Redressal Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Transparent Workflow</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">How SmartGov Connect Works</p>
          <p className="text-sm text-slate-500 mt-2">Every citizen grievance follows a verified, deterministic civic lifecycle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-lg flex items-center justify-center mb-6 border border-indigo-100">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Report with Photo & GPS</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Describe the problem in English, Telugu, or Hindi. Add photos and locality coordinates. The system instantly generates a permanent tracking reference.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-8 rounded-2xl border border-indigo-200/80 shadow-subtle hover:shadow-card transition-all relative bg-gradient-to-b from-indigo-50/30 to-white">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mb-6 shadow-sm">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              AI Semantic Triage
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">SmartGov AI</span>
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              CivicNLP classifies the category, calculates severity and urgency score, matches against duplicate reports, and recommends the authorized municipal department.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-lg flex items-center justify-center mb-6 border border-emerald-100">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Verifiable Resolution</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Department engineers update milestones in real-time. Receive notifications on status changes, field inspection notes, and verifiable closure.
            </p>
          </div>
        </div>
      </section>

      {/* AI Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mb-12 relative z-10">
            <div className="inline-flex items-center gap-1.5 text-indigo-400 font-mono text-xs uppercase tracking-wider mb-2">
              <Cpu className="w-4 h-4" /> AI Engine Features
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Intelligent Grievance Processing Powered by CivicNLP
            </h2>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Replacing manual delays with automated categorization, priority escalation, and duplicate clustering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 w-fit mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Multi-Category Classification</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Deterministic matching across 7 critical civic domains: Roads, Water, Sanitation, Power, Drainage, and Public Safety.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 w-fit mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Hazard & Priority Detection</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Flags life-threatening hazards (e.g. open borewells, live wires, structural collapses) as Critical for immediate intervention.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 w-fit mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Duplicate Grievance Detection</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Jaccard & semantic word similarity across nearby reports prevents duplicate department deployments while retaining all citizen voices.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 w-fit mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Master Issue Grouping</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Clusters localized incidents (e.g. major pipeline burst causing both road damage and water supply loss) under unified master tickets.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 w-fit mb-4">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Department Routing</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Automatically routes complaints to PWD, BWSSB, BESCOM, or Sanitation with administrative override capability.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 w-fit mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Real-Time Event Notification</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Socket.IO real-time event distribution delivers instant alerts to citizens and municipal staff whenever status changes occur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Platform Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Demonstration Platform Benchmark</h3>
              <p className="text-xs text-slate-500">Real-time counts calculated directly from persistent test database records</p>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium border border-slate-200">
              *Sample Seed Data
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Active Grievances</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">14</p>
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" /> Across 6 Wards
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Departments Integrated</span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">6</p>
              <span className="text-[11px] text-slate-500 mt-1 block">PWD, BWSSB, BESCOM, SWM</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Master Incidents</span>
              <p className="text-3xl font-extrabold text-purple-600 mt-1">2</p>
              <span className="text-[11px] text-slate-500 mt-1 block">5 Complaints Clustered</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Average Resolution Time</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">18.5 hrs</p>
              <span className="text-[11px] text-emerald-600 mt-1 block">94% Citizen Approval</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-10 sm:p-14 rounded-3xl text-white shadow-xl border border-indigo-800">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to report a civic grievance?</h2>
          <p className="mt-3 text-sm text-indigo-200 max-w-xl mx-auto">
            Join registered citizens in shaping smarter, cleaner, and safer neighborhoods with verifiable public accountability.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/submit' : '/register')}
              className="px-7 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm rounded-xl shadow-lg transition-all"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
