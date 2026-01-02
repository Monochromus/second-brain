import { useCallback, useRef, useEffect } from 'react';

export function useAutosave(onSave, debounceMs = 500) {
  const timeoutRef = useRef(null);
  const pendingDataRef = useRef(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const save = useCallback(async (data) => {
    clearPending();
    pendingDataRef.current = null;

    if (!data) return;

    try {
      await onSave(data);
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [onSave, clearPending]);

  const debouncedSave = useCallback((data) => {
    clearPending();
    pendingDataRef.current = data;
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);
  }, [save, debounceMs, clearPending]);

  const saveImmediately = useCallback(async (data) => {
    clearPending();
    const dataToSave = data || pendingDataRef.current;
    if (dataToSave) {
      await save(dataToSave);
    }
  }, [save, clearPending]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPending();
  }, [clearPending]);

  return {
    debouncedSave,
    saveImmediately,
    hasPendingChanges: pendingDataRef.current !== null
  };
}
