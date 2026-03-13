'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon,
  Check,
  Loader2,
  FolderOpen,
  LogOut,
  RefreshCw,
  Download,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MoodImage, PinterestPin, PinterestBoard } from '@/types/creative';

interface PinterestImporterProps {
  onImportImages: (images: MoodImage[]) => void;
}

export function PinterestImporter({ onImportImages }: PinterestImporterProps) {
  const [connected, setConnected] = useState(false);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Pin browsing
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);
  const [boardPins, setBoardPins] = useState<PinterestPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());

  const loadBoards = useCallback(async () => {
    setLoadingBoards(true);
    setError(null);
    try {
      const res = await fetch('/api/pinterest/boards');
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'NO_TOKEN') {
          setError('Session expired. Please reconnect.');
          handleDisconnect();
          return;
        }
        setError(data.error || 'Error loading boards');
        return;
      }
      if (data.items && Array.isArray(data.items)) {
        setBoards(data.items);
        localStorage.setItem('aimily_pinterest_boards', JSON.stringify(data.items));
        localStorage.setItem('aimily_pinterest_connected', 'true');
      } else {
        setError('No boards found');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  // Restore state on mount + listen for popup OAuth message
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check URL params (fallback for non-popup flow)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pinterest_connected') === 'true') {
      setConnected(true);
      loadBoards();
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Restore from localStorage
    if (localStorage.getItem('aimily_pinterest_connected') === 'true') {
      setConnected(true);
      const stored = localStorage.getItem('aimily_pinterest_boards');
      if (stored) setBoards(JSON.parse(stored));
    }

    // Listen for popup OAuth completion
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'pinterest_connected') {
        setConnected(true);
        loadBoards();
      }
      if (event.data?.type === 'pinterest_error') {
        setError('Pinterest authentication failed. Please try again.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadBoards]);

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI ||
      'https://aimily.app/api/auth/pinterest/callback';
    const scope = 'boards:read,pins:read';
    const state = Math.random().toString(36).substring(7);
    const url = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    // Open in popup — stays on the same page
    const w = 500, h = 700;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;
    const popup = window.open(url, 'pinterest_auth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);

    // Fallback: if popup blocked, redirect
    if (!popup || popup.closed) {
      window.location.href = url;
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/auth/pinterest/signout', { method: 'POST' });
    } catch { /* ignore */ }
    setConnected(false);
    setBoards([]);
    setError(null);
    setViewingBoardId(null);
    setBoardPins([]);
    localStorage.removeItem('aimily_pinterest_connected');
    localStorage.removeItem('aimily_pinterest_boards');
    localStorage.removeItem('aimily_pinterest_selected');
    setDisconnecting(false);
  };

  const loadPins = async (boardId: string) => {
    setLoadingPins(true);
    setViewingBoardId(boardId);
    setSelectedPins(new Set());
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      if (res.ok && data.items) {
        setBoardPins(data.items);
      } else {
        setError('Error loading pins');
      }
    } catch {
      setError('Connection error loading pins');
    } finally {
      setLoadingPins(false);
    }
  };

  const togglePin = (pinId: string) => {
    setSelectedPins((prev) => {
      const n = new Set(prev);
      n.has(pinId) ? n.delete(pinId) : n.add(pinId);
      return n;
    });
  };

  const importSelected = () => {
    const images: MoodImage[] = boardPins
      .filter((pin) => selectedPins.has(pin.id))
      .map((pin) => ({
        id: `pinterest-${pin.id}`,
        src: pin.imageUrl,
        name: pin.title || 'Pinterest Pin',
        source: 'pinterest' as const,
      }));
    onImportImages(images);
    setViewingBoardId(null);
    setBoardPins([]);
    setSelectedPins(new Set());
  };

  const importAllBoard = async (boardId: string) => {
    setLoadingPins(true);
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      if (res.ok && data.items) {
        const images: MoodImage[] = data.items.map((pin: PinterestPin) => ({
          id: `pinterest-${pin.id}`,
          src: pin.imageUrl,
          name: pin.title || 'Pinterest Pin',
          source: 'pinterest' as const,
        }));
        onImportImages(images);
      }
    } catch { /* ignore */ }
    finally { setLoadingPins(false); }
  };

  /* ── Not connected ── */
  if (!connected) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 px-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-red-200 transition-colors">
        <svg className="h-5 w-5 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.97 2.22-2.97 1.05 0 1.56.78 1.56 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.61 2.18 1.8 2.18 2.16 0 3.82-2.28 3.82-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.38c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.37 8.05-7.37 4.23 0 7.51 3.01 7.51 7.04 0 4.2-2.65 7.58-6.33 7.58-1.24 0-2.4-.64-2.8-1.4l-.76 2.9c-.28 1.06-1.03 2.4-1.53 3.21A12 12 0 1 0 12 0z" />
        </svg>
        <span className="text-sm text-muted-foreground">Import from Pinterest</span>
        <Button size="sm" variant="outline" onClick={handleConnect} className="ml-auto">
          <LinkIcon className="h-3 w-3 mr-1" />
          Connect
        </Button>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => { setError(null); loadBoards(); }}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  /* ── Viewing pins from a board ── */
  if (viewingBoardId) {
    const boardName = boards.find((b) => b.id === viewingBoardId)?.name || 'Board';
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setViewingBoardId(null); setBoardPins([]); setSelectedPins(new Set()); }}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {boardName}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPins(selectedPins.size === boardPins.length ? new Set() : new Set(boardPins.map((p) => p.id)))}
              disabled={loadingPins}
            >
              {selectedPins.size === boardPins.length ? 'Deselect all' : 'Select all'}
            </Button>
            {selectedPins.size > 0 && (
              <Button size="sm" onClick={importSelected}>
                <Download className="h-3 w-3 mr-1" />
                Add {selectedPins.size} to moodboard
              </Button>
            )}
          </div>
        </div>
        {loadingPins ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm">Loading pins...</span>
          </div>
        ) : boardPins.length > 0 ? (
          <div className="grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {boardPins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => togglePin(pin.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                  selectedPins.has(pin.id)
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {selectedPins.has(pin.id) && (
                  <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <img src={pin.imageUrl} alt={pin.title || 'Pin'} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-sm text-muted-foreground">No pins found</p>
        )}
      </div>
    );
  }

  /* ── Board list (connected state) ── */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.97 2.22-2.97 1.05 0 1.56.78 1.56 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.61 2.18 1.8 2.18 2.16 0 3.82-2.28 3.82-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.38c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.37 8.05-7.37 4.23 0 7.51 3.01 7.51 7.04 0 4.2-2.65 7.58-6.33 7.58-1.24 0-2.4-.64-2.8-1.4l-.76 2.9c-.28 1.06-1.03 2.4-1.53 3.21A12 12 0 1 0 12 0z" />
          </svg>
          <span className="text-sm font-medium">Pinterest Boards</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            <Check className="h-2.5 w-2.5 mr-0.5" /> Connected
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={loadBoards} disabled={loadingBoards}>
            <RefreshCw className={`h-3 w-3 ${loadingBoards ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="text-muted-foreground hover:text-destructive">
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {loadingBoards ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm">Loading boards...</span>
        </div>
      ) : boards.length > 0 ? (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm"
            >
              {board.image_thumbnail_url ? (
                <img src={board.image_thumbnail_url} alt={board.name} className="w-full h-16 object-cover rounded-md mb-2" />
              ) : (
                <div className="w-full h-16 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <h4 className="font-medium text-xs truncate mb-0.5">{board.name}</h4>
              <p className="text-xs text-muted-foreground mb-2">{board.pin_count} pins</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => loadPins(board.id)}>
                  View
                </Button>
                <Button size="sm" className="flex-1 text-xs h-7" onClick={() => importAllBoard(board.id)} disabled={loadingPins}>
                  <Download className="h-3 w-3 mr-1" /> Import
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={loadBoards} disabled={loadingBoards}>
          <FolderOpen className="h-3 w-3 mr-1" /> Load boards
        </Button>
      )}
    </div>
  );
}
