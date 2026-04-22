"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, Zap, User, FolderOpen, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/* ── Inline editable collection name ── */
function CollectionNameBreadcrumb({ name, collectionId, isDark, onRename }: {
  name: string; collectionId: string; isDark: boolean; onRename?: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(name); }, [name]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) { setValue(name); setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        onRename?.(trimmed);
        setEditing(false);
      } else {
        setValue(name);
        setEditing(false);
      }
    } catch {
      setValue(name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <span className={`type-caption ${isDark ? 'text-crema/15' : 'text-carbon/15'}`}>›</span>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(name); setEditing(false); } }}
          disabled={saving}
          className={`type-caption font-medium max-w-[200px] bg-transparent border-b outline-none transition-colors ${
            isDark ? 'text-crema/70 border-crema/20' : 'text-carbon/60 border-carbon/20'
          }`}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`type-caption font-medium truncate max-w-[200px] transition-colors cursor-text ${
            isDark ? 'text-crema/50 hover:text-crema/80' : 'text-carbon/40 hover:text-carbon/70'
          }`}
          title="Click to rename"
        >
          {name}
        </button>
      )}
    </>
  );
}

interface NavbarProps {
  variant?: 'default' | 'workspace' | 'workspace-dark';
  collectionName?: string;
  collectionId?: string;
  sidebarWidth?: number;
  /** Callback when collection name is renamed */
  onCollectionRename?: (newName: string) => void;
}

export function Navbar({ variant = 'default', collectionName, collectionId, sidebarWidth = 0, onCollectionRename }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, signOut } = useAuth();
  const t = useTranslation();

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  // Workspace navbar — persistent header, shifts right for sidebar
  if (variant === 'workspace' || variant === 'workspace-dark') {
    const isDark = variant === 'workspace-dark';
    return (
      <div
        className={`fixed top-0 right-0 z-40 left-0 md:left-[var(--nav-left)] transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDark
            ? 'bg-transparent'
            : 'bg-shade/80 backdrop-blur-sm'
        }`}
        style={{ ['--nav-left' as string]: `${sidebarWidth}px` }}
      >
        <div className="flex h-16 items-center justify-end px-6 md:px-8">
          {/* Left side intentionally empty — logo + collection name live in sidebar */}

          {/* Right: notifications + avatar */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            {user && (
              <Link
                href="/account"
                className={`w-8 h-8 rounded-full flex items-center justify-center type-label hover:opacity-80 transition-all ${
                  isDark ? 'bg-crema/15 text-crema/70' : 'bg-carbon text-crema'
                }`}
                title={t.common.account}
              >
                {user.email?.charAt(0).toUpperCase()}
              </Link>
            )}
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authMode}
        />
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-shade/80 backdrop-blur-sm animate-fade-in">
      <div className="px-6 md:px-10">
      <div className="flex h-16 items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/aimily-logo-black.png"
            alt="aimily"
            width={774}
            height={96}
            className="object-contain h-6 w-auto opacity-60 hover:opacity-100 transition-opacity"
            priority
            unoptimized
          />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <Link
                  href="/account"
                  className="w-8 h-8 rounded-full bg-carbon flex items-center justify-center text-crema text-[11px] font-medium hover:bg-carbon/80 transition-colors"
                  title={t.common.account}
                >
                  {user.email?.charAt(0).toUpperCase()}
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuth('signin')}
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/50 text-[11px] font-medium tracking-[0.1em] uppercase transition-all hover:text-texto"
                >
                  {t.common.logIn}
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-carbon text-crema text-[11px] font-medium tracking-[0.12em] uppercase transition-all hover:bg-carbon/90"
                >
                  {t.common.startFreeTrial}
                </button>
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
            <span className="sr-only">{t.common.toggleMenu}</span>
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
                    {t.common.signOut}
                  </button>
                </div>
                <Link href="/my-collections" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <FolderOpen className="h-4 w-4" /> {t.common.myCollections}
                </Link>
                <Link href="/account" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <User className="h-4 w-4" /> {t.common.account}
                </Link>
                <Link href="/pricing" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="h-4 w-4" /> {t.common.pricing}
                </Link>
              </>
            ) : (
              <>
                <button onClick={() => { openAuth('signin'); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70">
                  <User className="h-4 w-4" /> {t.common.logIn}
                </button>
              </>
            )}
            <div className="pt-2">
              <button
                onClick={() => { openAuth('signup'); setMobileMenuOpen(false); }}
                className="w-full inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-carbon text-crema shadow hover:bg-carbon/90 h-10 px-4 py-2"
              >
                {t.common.startFreeTrial}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
      </div>
    </div>
  );
}
