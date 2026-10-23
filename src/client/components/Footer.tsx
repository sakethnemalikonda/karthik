import React from 'react';
import { ShieldCheck, Info, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs text-white">SG</span>
              SmartGov Connect AI
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Next-generation AI-assisted citizen grievance redressal system providing intelligent classification, duplicate detection, priority assignment, and end-to-end transparent municipal workflow tracking.
            </p>
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Powered by SmartGov CivicNLP
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Civic Services</h4>
            <ul className="space-y-2">
              <li><a href="/submit" className="hover:text-white transition-colors">Submit a Complaint</a></li>
              <li><a href="/track" className="hover:text-white transition-colors">Track Complaint Status</a></li>
              <li><a href="/complaints" className="hover:text-white transition-colors">My Grievance History</a></li>
              <li><a href="/login" className="hover:text-white transition-colors">Citizen Sign In</a></li>
            </ul>
          </div>

          {/* Municipal Depts */}
          <div>
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Participating Authorities</h4>
            <ul className="space-y-2">
              <li>Public Works & Roads (PWD)</li>
              <li>Water Supply & Sewerage Board (BWSSB)</li>
              <li>Solid Waste Management & Sanitation</li>
              <li>Electricity & Streetlights (BESCOM)</li>
              <li>Disaster & Public Safety Cell</li>
            </ul>
          </div>

          {/* Transparency & Disclaimer */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold mb-3 uppercase tracking-wider text-[11px]">Demonstration Notice</h4>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-[11px] leading-relaxed text-slate-300">
              <Info className="w-4 h-4 text-amber-400 mb-1 inline mr-1" />
              <strong>Disclaimer:</strong> This application is a technology demonstration platform. It is not an official government portal. All municipal data, complaints, and names are fictional test records created for evaluation purposes.
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© 2026 SmartGov Connect AI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Open Redressal Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
