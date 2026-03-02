import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pagePerf } from '../utils/pagePerf';
import { virtualListPerf } from '../utils/virtualListPerf';

/**
 * 性能指标控制台输出 - 默认开启，无 UI
 * 采集 FCP、LCP、路由切换、轮播切换耗时、列表首屏渲染等指标并输出到 console
 */
export function PerfConsoleLogger() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const lastPageLogRef = useRef({});

  useEffect(() => {
    pagePerf.collect();
    pagePerf.currentRoute = location.pathname;

    const logPageIfChanged = () => {
      const p = {
        fcp: pagePerf.fcp,
        lcp: pagePerf.lcp,
        routeChangeMs: pagePerf.routeChangeMs,
      };
      const last = lastPageLogRef.current;
      const changed =
        p.fcp !== last.fcp ||
        p.lcp !== last.lcp ||
        p.routeChangeMs !== last.routeChangeMs;
      if (changed && (p.fcp != null || p.lcp != null || p.routeChangeMs != null)) {
        lastPageLogRef.current = { ...p };
        console.log('[pagePerf]', p);
      }
    };

    const unsubPage = pagePerf.subscribe(logPageIfChanged);
    const stopFCP = pagePerf.observeFCP(logPageIfChanged);
    const stopLCP = pagePerf.observeLCP(logPageIfChanged);

    logPageIfChanged();

    const unsubVirtual = virtualListPerf.subscribe(() => {
      const v = {
        totalCount: virtualListPerf.totalCount,
        renderedRows: virtualListPerf.renderedRows,
        firstRenderMs: virtualListPerf.firstRenderMs,
      };
      if (v.totalCount > 0 || v.firstRenderMs != null) {
        console.log('[virtualListPerf]', v);
      }
    });

    return () => {
      unsubPage();
      stopFCP?.();
      stopLCP?.();
      unsubVirtual();
    };
  }, []);

  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    if (prev !== curr) {
      pagePerf.recordRouteChange(prev, curr);
      prevPathRef.current = curr;
    }
  }, [location.pathname]);

  return null;
}
