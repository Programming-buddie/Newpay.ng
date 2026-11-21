import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RotateCcw } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ENV } from '../config/env';
import { useAccount } from '../hooks/useAccount';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export function Settings() {
  const { logout } = useAuth();
  const { preferences, updatePreferences, resetDemoData } = useAccount();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleToggleHideBalance = async () => {
    const next = !preferences.hideBalanceByDefault;
    try {
      await updatePreferences({ hideBalanceByDefault: next });
      showToast({
        type: 'success',
        title: 'Preference saved',
        message: next
          ? 'Your balance will be hidden by default.'
          : 'Your balance will be visible by default.',
      });
    } catch {
      showToast({ type: 'error', title: 'Could not update preference' });
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      setIsResetModalOpen(false);
      showToast({
        type: 'info',
        title: 'Local data reset',
        message: 'Local accounts and transactions have been restored to defaults.',
      });
      navigate('/signin', { replace: true });
    } catch {
      showToast({ type: 'error', title: 'Unable to reset local data' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    showToast({ type: 'info', title: 'Signed out' });
    navigate('/signin', { replace: true });
  };

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Display preferences and account controls"
    >
      <div className="max-w-2xl space-y-5">
        <Card padding="lg" className="space-y-4">
          <h2 className="text-base font-semibold text-ink">Wallet preferences</h2>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-sm font-medium text-ink">Hide balance by default</p>
              <p className="text-xs text-muted mt-0.5">
                Mask your Naira balance when opening the dashboard.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.hideBalanceByDefault}
              aria-label="Hide balance by default"
              onClick={handleToggleHideBalance}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
                preferences.hideBalanceByDefault
                  ? 'bg-brand-700 border-brand-700'
                  : 'bg-subtle border-line'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  preferences.hideBalanceByDefault ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </Card>

        {ENV.USE_MOCK_API && (
          <Card padding="lg" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Local data management</h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Clear all locally saved accounts, balances, and transaction history to restore
                defaults.
              </p>
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsResetModalOpen(true)}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset local data</span>
              </Button>
            </div>
          </Card>
        )}

        <Card padding="lg" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Session</p>
            <p className="text-xs text-muted mt-0.5">Sign out of your current session.</p>
          </div>
          <Button type="button" variant="danger" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </Button>
        </Card>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset local data?"
        description="This action clears your locally saved accounts and transactions."
      >
        <div className="space-y-5">
          <p className="text-sm text-muted leading-relaxed">
            All custom users you created, transfers, and incoming payments stored in this browser
            will be deleted. The default account (₦500.00 balance) will be restored.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isResetting}
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              isLoading={isResetting}
              onClick={handleConfirmReset}
            >
              Yes, reset data
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
