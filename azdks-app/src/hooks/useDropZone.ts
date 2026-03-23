import { useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

export type DropState = 'idle' | 'hover' | 'dropping';

interface TauriDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

export function useDropZone(onDrop: (paths: string[]) => void) {
  const [dropState, setDropState] = useState<DropState>('idle');

  useEffect(() => {
    let unlistenHover: (() => void) | undefined;
    let unlistenDrop: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    const setup = async () => {
      unlistenHover = await listen<TauriDropPayload>('tauri://drag-over', () => {
        setDropState('hover');
      });

      unlistenDrop = await listen<TauriDropPayload>('tauri://drag-drop', (event) => {
        setDropState('dropping');
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          onDrop(paths);
        }
        setTimeout(() => setDropState('idle'), 100);
      });

      unlistenLeave = await listen('tauri://drag-leave', () => {
        setDropState('idle');
      });
    };

    setup();

    return () => {
      unlistenHover?.();
      unlistenDrop?.();
      unlistenLeave?.();
    };
  }, [onDrop]);

  return { dropState };
}
