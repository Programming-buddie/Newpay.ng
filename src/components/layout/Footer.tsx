import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <BrandLogo size="sm" />

        <div className="flex flex-wrap items-center gap-6 text-sm text-muted">
          <a href="#features" className="hover:text-ink transition-colors whitespace-nowrap">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-ink transition-colors whitespace-nowrap">
            How it works
          </a>
          <Link to="/signin" className="hover:text-ink transition-colors whitespace-nowrap">
            Sign In
          </Link>
          <Link to="/signup" className="hover:text-ink transition-colors whitespace-nowrap">
            Create Account
          </Link>
          <Link to="/admin" className="hover:text-ink transition-colors whitespace-nowrap">
            Admin
          </Link>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-muted">
          <span>© {BRAND.name}</span>
        </div>
      </div>
    </footer>
  );
}
