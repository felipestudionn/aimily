import { useRef, useCallback } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';

/**
 * Undo/redo state management for Fabric.js canvas.
 * Uses JSON state snapshots with a processing guard to prevent
 * re-entrant history capture during undo/redo operations.
 */
export function useCanvasHistory(fabricRef: React.RefObject<FabricCanvas | null>) {
  const historyUndo = useRef<string[]>([]);
  const historyRedo = useRef<string[]>([]);
  const isProcessing = useRef(false);

  const saveState = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isProcessing.current) return;
    const json = JSON.stringify(canvas.toDatalessJSON(['name', 'data']));
    historyUndo.current.push(json);
    historyRedo.current = [];
  }, [fabricRef]);

  const initHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    historyUndo.current = [JSON.stringify(canvas.toDatalessJSON(['name', 'data']))];
    historyRedo.current = [];

    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);
  }, [fabricRef, saveState]);

  const undo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyUndo.current.length <= 1) return;

    isProcessing.current = true;
    const currentState = historyUndo.current.pop()!;
    historyRedo.current.push(currentState);

    const prevState = historyUndo.current[historyUndo.current.length - 1];
    await canvas.loadFromJSON(prevState);
    canvas.renderAll();
    isProcessing.current = false;
  }, [fabricRef]);

  const redo = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyRedo.current.length === 0) return;

    isProcessing.current = true;
    const nextState = historyRedo.current.pop()!;
    historyUndo.current.push(nextState);

    await canvas.loadFromJSON(nextState);
    canvas.renderAll();
    isProcessing.current = false;
  }, [fabricRef]);

  const canUndo = historyUndo.current.length > 1;
  const canRedo = historyRedo.current.length > 0;

  return { initHistory, saveState, undo, redo, canUndo, canRedo };
}
