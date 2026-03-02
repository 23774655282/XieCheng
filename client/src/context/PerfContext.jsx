import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'perf_monitor';
const UNOPTIMIZED_KEY = 'perf_unoptimized';

const PerfContext = createContext(null);

export function PerfProvider({ children }) {
  const [isPerfMode, setPerfModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [isUnoptimizedMode, setUnoptimizedMode] = useState(() => {
    try {
      return localStorage.getItem(UNOPTIMIZED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setPerfMode = useCallback((v) => {
    setPerfModeState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {}
  }, []);

  const toggleUnoptimizedMode = useCallback(() => {
    setUnoptimizedMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(UNOPTIMIZED_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  return (
    <PerfContext.Provider
      value={{
        isPerfMode,
        setPerfMode,
        isUnoptimizedMode,
        toggleUnoptimizedMode,
        isLegacyCarousel: isUnoptimizedMode,
        isLegacyList: isUnoptimizedMode,
        toggleLegacyList: toggleUnoptimizedMode,
        toggleLegacyCarousel: toggleUnoptimizedMode,
      }}
    >
      {children}
    </PerfContext.Provider>
  );
}

export function usePerf() {
  const ctx = useContext(PerfContext);
  return ctx || {
    isPerfMode: false,
    setPerfMode: () => {},
    isUnoptimizedMode: false,
    toggleUnoptimizedMode: () => {},
    isLegacyCarousel: false,
    isLegacyList: false,
    toggleLegacyList: () => {},
    toggleLegacyCarousel: () => {},
  };
}
