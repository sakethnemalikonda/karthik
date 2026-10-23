import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from './NotificationBell.js';
import {
  Shield,
  FilePlus2,
  ListFilter,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Search,
  Sparkles,
  Users,
  Building,
  Layers,
  BarChart3,
  Sliders,
} from 'lucide-react';

interface NavbarProps {
  currentPath?: string;
  navigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath = window.location.pathname, navigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    if (navigate) {
      navigate(path);
    } else {
      window.location.href = path;
    }
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => goTo(user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-indigo-600 flex items-center justify-center shadow-subtle border border-indigo-500/20 text-white font-black text-lg">
            SG
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">SmartGov</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Connect Platform</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {!user && (
            <>
              <button
                onClick={() => goTo('/')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => goTo('/track')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/track') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4 text-slate-400" />
                Track Grievance
              </button>
            </>
          )}

          {user && user.role === 'CITIZEN' && (
            <>
              <button
                onClick={() => goTo('/dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/dashboard') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => goTo('/submit')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all`}
              >
                <FilePlus2 className="w-4 h-4" />
                File Grievance
              </button>
              <button
                onClick={() => goTo('/complaints')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/complaints') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                My Complaints
              </button>
              <button
                onClick={() => goTo('/track')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/track') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4" />
                Track
              </button>
            </>
          )}

          {user && user.role === 'ADMIN' && (
            <>
              <button
                onClick={() => goTo('/admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => goTo('/admin/complaints')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin/complaints') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                Complaints Queue
              </button>
              <button
                onClick={() => goTo('/admin/master-issues')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin/master-issues') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                Master Issues
              </button>
              <button
                onClick={() => goTo('/admin/users')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin/users') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Citizens
              </button>
              <button
                onClick={() => goTo('/admin/departments')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin/departments') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4" />
                Departments
              </button>
              <button
                onClick={() => goTo('/admin/reports')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/admin/reports') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Reports
              </button>
            </>
          )}
        </nav>

        {/* Right Section: Auth / Profile / Bell */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <button
                onClick={() => goTo('/profile')}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                title="Profile"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  user.role === 'ADMIN' ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-200 text-slate-800'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    {user.role === 'ADMIN' && <Shield className="w-2.5 h-2.5 text-indigo-600" />}
                    {user.role}
                  </p>
                </div>
              </button>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo('/login')}
                className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => goTo('/register')}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          {!user ? (
            <>
              <button onClick={() => goTo('/')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Home</button>
              <button onClick={() => goTo('/track')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Track Grievance</button>
              <button onClick={() => goTo('/login')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Login</button>
              <button onClick={() => goTo('/register')} className="w-full text-left py-2 text-sm font-medium text-indigo-600 font-bold">Register Citizen</button>
            </>
          ) : user.role === 'CITIZEN' ? (
            <>
              <button onClick={() => goTo('/dashboard')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Dashboard</button>
              <button onClick={() => goTo('/submit')} className="w-full text-left py-2 text-sm font-semibold text-indigo-600">File New Grievance</button>
              <button onClick={() => goTo('/complaints')} className="w-full text-left py-2 text-sm font-medium text-slate-700">My Complaints</button>
              <button onClick={() => goTo('/track')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Track Grievance</button>
              <button onClick={() => goTo('/profile')} className="w-full text-left py-2 text-sm font-medium text-slate-700">My Profile</button>
            </>
          ) : (
            <>
              <button onClick={() => goTo('/admin')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Overview</button>
              <button onClick={() => goTo('/admin/complaints')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Complaints Queue</button>
              <button onClick={() => goTo('/admin/master-issues')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Master Issues</button>
              <button onClick={() => goTo('/admin/users')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Citizens</button>
              <button onClick={() => goTo('/admin/departments')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Departments</button>
              <button onClick={() => goTo('/admin/reports')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Reports</button>
              <button onClick={() => goTo('/profile')} className="w-full text-left py-2 text-sm font-medium text-slate-700">Admin Profile</button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
