import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 text-center">
      <BrandLogo size="sm" />
      <p className="mt-8 text-xs font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-display font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted max-w-sm">
        The page you requested does not exist or may have been moved.
      </p>
      <div className="mt-6">
        <Link to={isAuthenticated ? '/dashboard' : '/'}>
          <Button>{isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}</Button>
        </Link>
      </div>
    </div>
  );
}
