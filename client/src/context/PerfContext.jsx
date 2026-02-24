import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'perf_monitor';
const LEGACY_CAROUSEL_KEY = 'perf_legacy_carousel';
const LEGACY_LIST_KEY = 'perf_legacy_list';

const PerfContext = createContext(null);

export function PerfProvider({ children }) {
  const [isPerfMode, setPerfModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isLegacyCarousel, setLegacyCarousel] = useState(() => {
    try {
      return localStorage.getItem(LEGACY_CAROUSEL_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isLegacyList, setLegacyList] = useState(() => {
    try {
      return localStorage.getItem(LEGACY_LIST_KEY) === '1';
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

  const toggleLegacyCarousel = useCallback(() => {
    setLegacyCarousel((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LEGACY_CAROUSEL_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  const toggleLegacyList = useCallback(() => {
    setLegacyList((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LEGACY_LIST_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  return (
    <PerfContext.Provider
      value={{
        isPerfMode,
        setPerfMode,
        isLegacyCarousel,
        toggleLegacyCarousel,
        isLegacyList,
        toggleLegacyList,
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
    isLegacyCarousel: false,
    toggleLegacyCarousel: () => {},
    isLegacyList: false,
    toggleLegacyList: () => {},
  };
}
