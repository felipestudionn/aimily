'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon,
  Check,
  X,
  Loader2,
  FolderOpen,
  LogOut,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MoodImage, PinterestPin, PinterestBoard } from '@/types/creative';

interface PinterestImporterProps {
  /** Called when user imports pins as moodboard images */
  onImportImages: (images: MoodImage[]) => void;
  /** Render without Card wrapper */
  compact?: boolean;
}

export function PinterestImporter({ onImportImages, compact = false }: PinterestImporterProps) {
  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [pinterestBoards, setPinterestBoards] = useState<PinterestBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [pinterestError, setPinterestError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Pin viewing state
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);
  const [boardPins, setBoardPins] = useState<PinterestPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());

  const loadPinterestBoards = useCallback(async () => {
    setLoadingBoards(true);
    setPinterestError(null);
    try {
      const res = await fetch('/api/pinterest/boards');
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'NO_TOKEN') {
          setPinterestError('Your Pinterest session has expired. Please reconnect.');
          handlePinterestDisconnect();
          return;
        }
        setPinterestError(data.error || 'Error loading Pinterest boards');
        return;
      }

      if (data.items && Array.isArray(data.items)) {
        setPinterestBoards(data.items);
        localStorage.setItem('aimily_pinterest_boards', JSON.stringify(data.items));
        localStorage.setItem('aimily_pinterest_connected', 'true');
        setPinterestError(null);
      } else {
        setPinterestError('No boards found in your Pinterest account');
      }
    } catch {
      setPinterestError('Connection error. Please try again.');
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pinterest_connected') === 'true') {
      setPinterestConnected(true);
      loadPinterestBoards();
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('pinterest_disconnected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const storedState = localStorage.getItem('aimily_pinterest_connected');
    if (storedState === 'true') {
      setPinterestConnected(true);
      const storedBoards = localStorage.getItem('aimily_pinterest_boards');
      if (storedBoards) setPinterestBoards(JSON.parse(storedBoards));
    }
  }, [loadPinterestBoards]);

  const handlePinterestConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI ||
      'https://aimily.app/api/auth/pinterest/callback';
    const scope = 'boards:read,pins:read';
    const state = Math.random().toString(36).substring(7);
    window.location.href = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&state=${state}`;
  };

  const handlePinterestDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch('/api/auth/pinterest/signout', { method: 'POST' });
      setPinterestConnected(false);
      setPinterestBoards([]);
      setPinterestError(null);
      setViewingBoardId(null);
      setBoardPins([]);
      localStorage.removeItem('aimily_pinterest_connected');
      localStorage.removeItem('aimily_pinterest_boards');
      localStorage.removeItem('aimily_pinterest_selected');
    } catch {
      // ignore
    } finally {
      setIsDisconnecting(false);
    }
  };

  const loadBoardPins = async (boardId: string) => {
    setLoadingPins(true);
    setViewingBoardId(boardId);
    setSelectedPins(new Set());
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      if (res.ok && data.items) {
        setBoardPins(data.items);
      } else {
        setPinterestError('Error loading board pins');
      }
    } catch {
      setPinterestError('Connection error loading pins');
    } finally {
      setLoadingPins(false);
    }
  };

  const togglePinSelection = (pinId: string) => {
    setSelectedPins((prev) => {
      const n = new Set(prev);
      n.has(pinId) ? n.delete(pinId) : n.add(pinId);
      return n;
    });
  };

  const selectAllPins = () => {
    setSelectedPins(
      selectedPins.size === boardPins.length ? new Set() : new Set(boardPins.map((p) => p.id))
    );
  };

  const importSelectedPins = () => {
    const newImages: MoodImage[] = boardPins
      .filter((pin) => selectedPins.has(pin.id))
      .map((pin) => ({
        id: `pinterest-${pin.id}`,
        src: pin.imageUrl,
        name: pin.title || 'Pinterest Pin',
        source: 'pinterest' as const,
      }));
    onImportImages(newImages);
    setViewingBoardId(null);
    setBoardPins([]);
    setSelectedPins(new Set());
  };

  const importAllBoardPins = async (boardId: string) => {
    setLoadingPins(true);
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      if (res.ok && data.items) {
        const newImages: MoodImage[] = data.items.map((pin: PinterestPin) => ({
          id: `pinterest-${pin.id}`,
          src: pin.imageUrl,
          name: pin.title || 'Pinterest Pin',
          source: 'pinterest' as const,
        }));
        onImportImages(newImages);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPins(false);
    }
  };

  /* ── Render helpers ── */

  const renderPinGrid = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setViewingBoardId(null);
            setBoardPins([]);
            setSelectedPins(new Set());
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to boards
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={selectAllPins} disabled={loadingPins}>
            {selectedPins.size === boardPins.length ? 'Deselect all' : 'Select all'}
          </Button>
          {selectedPins.size > 0 && (
            <Button size="sm" onClick={importSelectedPins}>
              <Download className="h-4 w-4 mr-1" />
              Import {selectedPins.size} pins
            </Button>
          )}
        </div>
      </div>
      {loadingPins ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading pins...</span>
        </div>
      ) : boardPins.length > 0 ? (
        <div className="grid gap-3 grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {boardPins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => togglePinSelection(pin.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                selectedPins.has(pin.id)
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {selectedPins.has(pin.id) && (
                <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              <img
                src={pin.imageUrl}
                alt={pin.title || 'Pin'}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">No pins found in this board</p>
      )}
    </div>
  );

  const renderBoardList = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Click a board to view pins, or import the entire board
        </p>
        <Button variant="ghost" size="sm" onClick={loadPinterestBoards} disabled={loadingBoards}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loadingBoards ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pinterestBoards.map((board) => (
          <div
            key={board.id}
            className="relative p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
          >
            {board.image_thumbnail_url ? (
              <img
                src={board.image_thumbnail_url}
                alt={board.name}
                className="w-full h-20 object-cover rounded-md mb-2"
              />
            ) : (
              <div className="w-full h-20 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <h4 className="font-medium text-sm truncate mb-1">{board.name}</h4>
            <p className="text-xs text-muted-foreground mb-3">{board.pin_count} pins</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => loadBoardPins(board.id)}
              >
                View pins
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={() => importAllBoardPins(board.id)}
                disabled={loadingPins}
              >
                <Download className="h-3 w-3 mr-1" />
                Import
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => (
    <>
      {/* Error */}
      {pinterestError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{pinterestError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPinterestBoards}
              className="mt-2 text-red-600 hover:text-red-700 p-0 h-auto"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {!pinterestConnected ? (
        <div className="text-center py-6 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Connect your Pinterest account to import boards as creative inspiration</p>
        </div>
      ) : loadingBoards ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading your boards...</span>
        </div>
      ) : viewingBoardId ? (
        renderPinGrid()
      ) : pinterestBoards.length > 0 ? (
        renderBoardList()
      ) : (
        <div className="text-center py-6">
          <Button onClick={loadPinterestBoards} disabled={loadingBoards}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Load My Boards
          </Button>
        </div>
      )}
    </>
  );

  if (compact) {
    return renderContent();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.97 2.22-2.97 1.05 0 1.56.78 1.56 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.61 2.18 1.8 2.18 2.16 0 3.82-2.28 3.82-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.38c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.37 8.05-7.37 4.23 0 7.51 3.01 7.51 7.04 0 4.2-2.65 7.58-6.33 7.58-1.24 0-2.4-.64-2.8-1.4l-.76 2.9c-.28 1.06-1.03 2.4-1.53 3.21A12 12 0 1 0 12 0z" />
              </svg>
              Pinterest Boards
            </CardTitle>
            <CardDescription>
              Import inspiration directly from your Pinterest boards
            </CardDescription>
          </div>
          {!pinterestConnected ? (
            <Button onClick={handlePinterestConnect}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Connect Pinterest
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePinterestDisconnect}
                disabled={isDisconnecting}
                className="text-muted-foreground hover:text-destructive"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
