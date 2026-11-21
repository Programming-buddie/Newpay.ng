import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';
import { AccountProvider } from './context/AccountContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './hooks/useAuth';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';
import { Profile } from './pages/Profile';
import { Receive } from './pages/Receive';
import { Send } from './pages/Send';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Transactions } from './pages/Transactions';

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-medium text-muted">Loading wallet…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <AuthLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <AuthLoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AccountProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/signin"
                  element={
                    <GuestOnlyRoute>
                      <SignIn />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <GuestOnlyRoute>
                      <SignUp />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <GuestOnlyRoute>
                      <ForgotPassword />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/send"
                  element={
                    <ProtectedRoute>
                      <Send />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/receive"
                  element={
                    <ProtectedRoute>
                      <Receive />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AccountProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
