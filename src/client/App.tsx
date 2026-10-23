import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { CitizenDashboard } from './pages/CitizenDashboard.js';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage.js';
import { MyComplaintsPage } from './pages/MyComplaintsPage.js';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.js';
import { TrackComplaintPage } from './pages/TrackComplaintPage.js';
import { CitizenProfilePage } from './pages/CitizenProfilePage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage.js';
import { AdminUsersPage } from './pages/AdminUsersPage.js';
import { AdminDepartmentsPage } from './pages/AdminDepartmentsPage.js';
import { AdminMasterIssuesPage } from './pages/AdminMasterIssuesPage.js';
import { AdminReportsPage } from './pages/AdminReportsPage.js';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Route matching
  const renderRoute = () => {
    // Public routes
    if (currentPath === '/') {
      return <LandingPage navigate={navigate} />;
    }
    if (currentPath === '/login') {
      return <LoginPage navigate={navigate} />;
    }
    if (currentPath === '/register') {
      return <RegisterPage navigate={navigate} />;
    }
    if (currentPath.startsWith('/track')) {
      const parts = currentPath.split('/');
      const initialId = parts[2] || '';
      return <TrackComplaintPage initialComplaintId={initialId} navigate={navigate} />;
    }

    // Auth required guard
    if (!user) {
      return <LoginPage navigate={navigate} />;
    }

    // Citizen & General Authenticated Routes
    if (currentPath === '/dashboard') {
      return user.role === 'ADMIN' ? <AdminDashboard navigate={navigate} /> : <CitizenDashboard navigate={navigate} />;
    }
    if (currentPath === '/submit') {
      return <SubmitComplaintPage navigate={navigate} />;
    }
    if (currentPath === '/complaints') {
      return <MyComplaintsPage navigate={navigate} />;
    }
    if (currentPath.startsWith('/complaints/')) {
      const complaintId = currentPath.replace('/complaints/', '');
      return <ComplaintDetailPage complaintId={complaintId} navigate={navigate} />;
    }
    if (currentPath === '/profile') {
      return <CitizenProfilePage />;
    }
    if (currentPath === '/notifications') {
      return <NotificationsPage navigate={navigate} />;
    }

    // Admin Protected Routes
    if (currentPath.startsWith('/admin')) {
      if (user.role !== 'ADMIN') {
        return (
          <div className="max-w-md mx-auto py-24 text-center space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-500">You must be logged in as a municipal administrator to view this area.</p>
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
              Return to Citizen Portal
            </button>
          </div>
        );
      }

      if (currentPath === '/admin' || currentPath === '/admin/overview') {
        return <AdminDashboard navigate={navigate} />;
      }
      if (currentPath === '/admin/complaints') {
        return <AdminComplaintsPage navigate={navigate} />;
      }
      if (currentPath === '/admin/users') {
        return <AdminUsersPage />;
      }
      if (currentPath === '/admin/departments') {
        return <AdminDepartmentsPage />;
      }
      if (currentPath === '/admin/master-issues') {
        return <AdminMasterIssuesPage />;
      }
      if (currentPath === '/admin/reports') {
        return <AdminReportsPage />;
      }
    }

    // Fallback to Dashboard or Landing
    return <LandingPage navigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <main className="flex-1">{renderRoute()}</main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
};
