import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from './BrandLogo';

export function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <Link
          to="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-lg"
        >
          <BrandLogo />
        </Link>

        <nav
          aria-label="Landing navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-muted"
        >
          <a
            href="#features"
            className="hover:text-ink transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-ink transition-colors whitespace-nowrap shrink-0"
          >
            How it works
          </a>
          <a
            href="#trust"
            className="hover:text-ink transition-colors whitespace-nowrap shrink-0"
          >
            Trust
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-xl transition-colors whitespace-nowrap shrink-0 inline-flex items-center"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/signin"
                className="min-h-[40px] px-3 py-2 text-sm font-medium text-ink hover:text-brand-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-xl transition-colors whitespace-nowrap shrink-0 inline-flex items-center"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
