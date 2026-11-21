import React from 'react';
import { AlertTriangle } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { Button } from './ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message ?? null };
  }

  handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.errorMessage ?? '';
      const isQuotaError = msg.includes('Quota exceeded');
      const isFreeReadQuota = msg.includes(
        "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
      );
      const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-line rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-debit-bg text-debit flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-ink">
              {isQuotaError ? 'Database quota reached' : 'Something went wrong'}
            </h1>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {isQuotaError
                ? 'The free daily Firestore quota has been exceeded. Quota resets tomorrow, or you can upgrade your Firebase plan.'
                : 'An unexpected error occurred while connecting to your wallet. Your saved account data is preserved.'}
            </p>
            {isFreeReadQuota && (
              <p className="mt-3 text-xs">
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-4"
                >
                  Open Firebase Firestore upgrade options
                </a>
              </p>
            )}
            <div className="mt-6">
              <Button onClick={this.handleReload} fullWidth>
                Return to home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
