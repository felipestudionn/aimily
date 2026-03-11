"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, User, LogOut, FolderOpen, Zap } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 animate-fade-in">
      <div className="container mx-auto">
      <div className="flex h-24 items-center px-2 md:px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/aimily-logo-black.png"
            alt="aimily"
            width={774}
            height={96}
            className="object-contain h-7 w-auto"
            priority
            unoptimized
          />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/my-collections"
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/70 text-sm font-medium transition-all hover:text-texto"
                >
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  My Collections
                </Link>
                <Link
                  href="/new-collection"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide transition-all hover:bg-carbon/90"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  New Collection
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/70 text-sm font-medium transition-all hover:text-texto"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Pricing
                </Link>
                <NotificationBell />
                {/* User Profile */}
                <div className="flex items-center gap-1 pl-3 border-l border-gris/40">
                  <Link
                    href="/account"
                    className="flex items-center gap-2 px-2 py-1.5 hover:opacity-70 transition-opacity"
                    title="Account settings"
                  >
                    <div className="w-7 h-7 bg-carbon flex items-center justify-center text-crema text-xs font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-texto/40 hover:text-texto transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/70 text-sm font-medium transition-all hover:text-texto"
                >
                  <User className="mr-1.5 h-3.5 w-3.5" />
                  Sign In
                </button>
                <Link
                  href="/new-collection"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide transition-all hover:bg-carbon/90"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  New Collection
                </Link>
              </>
            )}
          </div>
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
            <span className="sr-only">Toggle Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-b shadow-md">
          <div className="flex flex-col space-y-4 p-6">
            {user ? (
              <>
                <div className="flex items-center justify-between py-3 border-b border-gris/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-carbon flex items-center justify-center text-crema text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-texto">{user.email}</span>
                  </div>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="text-sm text-texto/50 hover:text-texto"
                  >
                    Sign Out
                  </button>
                </div>
                <Link href="/my-collections" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <FolderOpen className="h-4 w-4" /> My Collections
                </Link>
                <Link href="/account" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <User className="h-4 w-4" /> Account
                </Link>
                <Link href="/pricing" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="h-4 w-4" /> Pricing
                </Link>
              </>
            ) : (
              <>
                <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70">
                  <User className="h-4 w-4" /> Sign In
                </button>
              </>
            )}
            <div className="pt-2">
              <Link
                href="/new-collection"
                className="w-full inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                New Collection
              </Link>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      </div>
    </div>
  );
}
