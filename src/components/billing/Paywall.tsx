'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';

export default function Paywall() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#fff6dc] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Your 14-day trial has ended
          </h1>
          <p className="text-gray-600 mb-8">
            Choose a plan to continue creating collections, using AI tools, and managing your fashion workflow.
          </p>
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="block w-full py-3 px-6 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              See Plans
            </Link>
            <Link
              href="/contact"
              className="block w-full py-3 px-6 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
