import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { BRAND } from '../config/brand';

const HERO_IMAGE_URL = '/src/assets/images/hero_nigeria_fintech_1795250530581.jpg';

export function Landing() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-brand-700">
                Naira Digital Wallet
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-[1.1] text-balance">
                Send, receive, and track Naira with complete clarity.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed max-w-xl">
                {BRAND.name} gives you a clean, distraction-free wallet to transfer funds across
                local banks, receive payments, and verify every kobo in one ledger.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/signup"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/signin"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-surface border border-line hover:bg-subtle text-ink text-sm font-semibold inline-flex items-center transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  Sign In
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="whitespace-nowrap">₦500.00 welcome bonus</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">25+ supported banks</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">Integer-kobo ledger</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="relative w-full rounded-2xl overflow-hidden border border-line bg-brand-900 min-h-[300px] sm:min-h-[380px] flex items-end">
                {!imgFailed ? (
                  <img
                    src={HERO_IMAGE_URL}
                    alt="Person checking a digital wallet on a smartphone"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="absolute inset-0 bg-brand-900 flex items-center justify-center p-8 text-center">
                    <p className="text-brand-100 text-sm font-medium">
                      {BRAND.name} Naira Wallet Preview
                    </p>
                  </div>
                )}

                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                  aria-hidden="true"
                />

                <div className="relative z-10 w-full p-5 sm:p-6">
                  <div className="bg-surface/95 backdrop-blur-md border border-line rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted">Sample wallet balance</p>
                      <p className="mt-0.5 text-xl sm:text-2xl font-display font-bold text-ink tabular-nums">
                        ₦650.00
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-credit font-semibold">+₦250.00 received</p>
                      <p className="text-xs text-muted mt-0.5 font-mono tabular-nums">
                        2048193052
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features (Asymmetric Bento) */}
        <section id="features" className="border-t border-line bg-surface py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight text-balance">
                Focused tools for everyday Naira movement
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-muted leading-relaxed">
                Built around the four core actions people use every day—without bloated menus or
                confusing financial jargon.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div className="md:col-span-2 p-6 sm:p-7 rounded-2xl border border-line bg-canvas flex flex-col justify-between gap-6">
                <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Send money</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
                    Pick from 25+ local banks and fintechs, validate 10-digit account numbers
                    before sending, review your remaining balance upfront, and receive an instant
                    transfer reference.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl border border-line bg-canvas flex flex-col justify-between gap-6">
                <div className="w-10 h-10 rounded-xl bg-subtle text-brand-700 border border-line flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Receive money</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    Copy your dedicated 10-digit account number in one tap and track incoming
                    payments directly in your wallet.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl border border-line bg-canvas flex flex-col justify-between gap-6">
                <div className="w-10 h-10 rounded-xl bg-subtle text-brand-700 border border-line flex items-center justify-center">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Track every transaction</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    Filter between Money Sent and Money Received, inspect counterparty details, and
                    verify exact balance-after snapshots.
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 p-6 sm:p-7 rounded-2xl border border-line bg-canvas flex flex-col justify-between gap-6">
                <div className="w-10 h-10 rounded-xl bg-subtle text-brand-700 border border-line flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Simple and accessible</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
                    Designed for mobile thumb navigation and full desktop clarity alike—with large
                    44px+ touch targets, tabular currency alignment, and balance privacy toggles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 sm:py-20 border-t border-line bg-canvas">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
                How it works
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted">
                Try the complete wallet journey in under two minutes.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01. Create account',
                  body: 'Sign in with your Google account to open your Naira wallet in seconds.',
                },
                {
                  step: '02. Add or receive money',
                  body: 'Start with a ₦500.00 welcome bonus and share your account details to receive payments.',
                },
                {
                  step: '03. Send and track',
                  body: 'Transfer Naira to any supported bank in the list, review your balance before confirming, and inspect your ledger history.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-2xl bg-surface border border-line flex flex-col gap-3"
                >
                  <h3 className="text-base font-display font-bold text-brand-700">{item.step}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Clarity */}
        <section id="trust" className="py-16 sm:py-20 border-t border-line bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Built for clarity</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight text-balance">
                  Clear confirmations and exact accounting on every transfer
                </h2>
                <p className="text-sm sm:text-base text-muted leading-relaxed">
                  {BRAND.name} keeps everyday money management straightforward. Review recipient
                  details and your remaining balance before confirming, hide your balance in public
                  spaces, and verify every entry in one clean ledger.
                </p>
              </div>

              <div className="lg:col-span-5">
                <ul className="space-y-3 p-6 rounded-2xl bg-canvas border border-line text-sm text-ink">
                  {[
                    'All amounts stored and calculated in integer kobo',
                    'Duplicate transfer protection on every submission',
                    'One-tap balance privacy toggle on your dashboard',
                    'Complete transaction receipts and reference codes',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-16 sm:py-20 border-t border-line bg-brand-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-balance">
              Manage your Naira with {BRAND.name}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-brand-100 max-w-xl mx-auto">
              Create your account in seconds with a ₦500.00 welcome bonus and start sending,
              receiving, and tracking your money.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/signup"
                className="min-h-[48px] px-6 py-3 rounded-xl bg-white text-brand-900 hover:bg-brand-50 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/signin"
                className="min-h-[48px] px-6 py-3 rounded-xl border border-white/25 text-white hover:bg-white/10 text-sm font-semibold inline-flex items-center transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
