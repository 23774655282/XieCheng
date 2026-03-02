import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePerf } from '../context/PerfContext';
import { carouselPerf } from '../utils/carouselPerf';
import { pagePerf } from '../utils/pagePerf';

/**
 * 性能监控面板 - 全站可用
 * 启用方式：点击右下角 Perf 按钮（开发环境）
 */
export function CarouselPerformanceMonitor() {
  const location = useLocation();
  const { isPerfMode: show, isUnoptimizedMode: isLegacy, toggleUnoptimizedMode } = usePerf();
  const isHomePage = location.pathname === '/';
  const prevPathRef = useRef(location.pathname);

  const [metrics, setMetrics] = useState({
    fps: 0,
    lastTransition: null,
    history: [],
  });
  const [pageMetrics, setPageMetrics] = useState({
    fcp: null,
    lcp: null,
    jsSize: 0,
    buildSize: null,
    routeChangeMs: null,
    currentRoute: '',
  });
  const [copyStatus, setCopyStatus] = useState('');
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef(null);

  const updatePageMetrics = () => {
    setPageMetrics({
      fcp: pagePerf.fcp,
      lcp: pagePerf.lcp,
      jsSize: pagePerf.jsTotalBytes,
      buildSize: pagePerf.buildTotalBytes,
      routeChangeMs: pagePerf.routeChangeMs,
      currentRoute: pagePerf.currentRoute || location.pathname,
    });
  };

  useEffect(() => {
    if (!show) return;

    pagePerf.collect();
    pagePerf.currentRoute = location.pathname;
    pagePerf.fetchBuildSize().then(updatePageMetrics);
    const unsubPage = pagePerf.subscribe(() => {
      updatePageMetrics();
      const p = { fcp: pagePerf.fcp, lcp: pagePerf.lcp, routeChangeMs: pagePerf.routeChangeMs, jsSize: pagePerf.jsTotalBytes, buildSize: pagePerf.buildTotalBytes };
      if (p.fcp != null || p.lcp != null || p.routeChangeMs != null || p.jsSize > 0 || p.buildSize != null) {
        console.log('[pagePerf]', p);
      }
    });
    const stopFCP = pagePerf.observeFCP(() => updatePageMetrics());
    const stopLCP = pagePerf.observeLCP(() => updatePageMetrics());

    const updateMetrics = () => {
      setMetrics({
        fps: carouselPerf.currentFps,
        lastTransition: carouselPerf.lastTransition,
        history: [...carouselPerf.history],
      });
      setPageMetrics((p) => ({
        ...p,
        jsSize: pagePerf.jsTotalBytes,
      }));
    };

    const unsubscribe = carouselPerf.subscribe(updateMetrics);

    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      frameCountRef.current += 1;

      carouselPerf.currentFps = delta > 0 ? Math.round(1000 / delta) : 0;
      carouselPerf.recordFrame(delta);

      setMetrics((m) => ({ ...m, fps: carouselPerf.currentFps }));
      rafRef.current = requestAnimationFrame(measureFps);
    };

    rafRef.current = requestAnimationFrame(measureFps);
    updatePageMetrics();
    console.log('[pagePerf] 初始化', { fcp: pagePerf.fcp, lcp: pagePerf.lcp, routeChangeMs: pagePerf.routeChangeMs, jsSize: pagePerf.jsTotalBytes });
    return () => {
      unsubscribe();
      unsubPage();
      stopFCP?.();
      stopLCP?.();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const prev = prevPathRef.current;
    const curr = location.pathname;
    if (prev !== curr) {
      pagePerf.recordRouteChange(prev, curr);
      prevPathRef.current = curr;
    }
  }, [location.pathname, show]);

  if (!show) return null;

  const t = metrics.lastTransition;
  const lastToFirst = t?.isLastToFirst ?? false;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] w-80 rounded-lg border border-gray-300 bg-white/95 shadow-xl backdrop-blur-sm"
      aria-label="轮播性能监控"
    >
      <div className="border-b border-gray-200 bg-amber-50 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-800">
          性能监控
          <button
            type="button"
            onClick={toggleUnoptimizedMode}
            className={`ml-2 rounded px-1.5 py-0.5 text-xs ${isLegacy ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} hover:opacity-80`}
            title="切换未优化/已优化（懒加载、骨架屏、虚拟列表等）"
          >
            {isLegacy ? '未优化' : '已优化'}
          </button>
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          未优化=无懒加载、骨架屏、虚拟列表；已优化=全部启用
        </p>
      </div>
      <div className="p-3 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
        <div className="space-y-1.5">
          <div className="font-medium text-gray-700">当前路由</div>
          <div className="text-xs font-mono text-gray-600 truncate" title={pageMetrics.currentRoute || location.pathname}>
            {pageMetrics.currentRoute || location.pathname || '/'}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="font-medium text-gray-700">页面级指标</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-500">FCP</span>
            <span className={`font-mono text-right ${pageMetrics.fcp != null ? (pageMetrics.fcp <= 1800 ? 'text-green-600' : pageMetrics.fcp <= 3000 ? 'text-amber-600' : 'text-red-600') : 'text-gray-400'}`} title={pageMetrics.fcp == null ? 'FCP 需整页刷新后获取，或浏览器不支持 Paint Timing' : ''}>
              {pageMetrics.fcp != null ? `${pageMetrics.fcp} ms` : '—'}
            </span>
            <span className="text-gray-500">LCP</span>
            <span className={`font-mono text-right ${pageMetrics.lcp != null ? (pageMetrics.lcp <= 2500 ? 'text-green-600' : pageMetrics.lcp <= 4000 ? 'text-amber-600' : 'text-red-600') : 'text-gray-400'}`}>
              {pageMetrics.lcp != null ? `${pageMetrics.lcp} ms` : '—'}
            </span>
            <span className="text-gray-500">JS 已加载</span>
            <span className="font-mono text-right">
              {pageMetrics.jsSize > 0 ? pagePerf.formatBytes(pageMetrics.jsSize) : '—'}
            </span>
            <span className="text-gray-500">JS Bundle</span>
            <span className="font-mono text-right">
              {pageMetrics.buildSize != null ? pagePerf.formatBytes(pageMetrics.buildSize) : '需 build'}
            </span>
            <span className="text-gray-500">路由切换</span>
            <span className={`font-mono text-right ${pageMetrics.routeChangeMs != null ? (pageMetrics.routeChangeMs <= 300 ? 'text-green-600' : pageMetrics.routeChangeMs <= 500 ? 'text-amber-600' : 'text-red-600') : 'text-gray-400'}`}>
              {pageMetrics.routeChangeMs != null ? `${pageMetrics.routeChangeMs} ms` : '—'}
            </span>
          </div>
        </div>

        <hr className="border-gray-100" />
        {isHomePage ? (
        <>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">实时 FPS</span>
          <span className={`font-mono font-bold ${metrics.fps >= 55 ? 'text-green-600' : metrics.fps >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
            {metrics.fps}
          </span>
        </div>

        {t && t.durationMs != null && (
          <>
            <hr className="border-gray-100" />
            <div className="space-y-1.5">
              <div className="font-medium text-gray-700">最近一次切换</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-500">耗时</span>
                <span className="font-mono text-right">{t.durationMs} ms</span>
                <span className="text-gray-500">平均 FPS</span>
                <span className="font-mono text-right">{t.avgFps || '—'}</span>
                <span className="text-gray-500">掉帧数</span>
                <span className="font-mono text-right">{t.frameDrops ?? 0}</span>
                <span className="text-gray-500">类型</span>
                <span className={`text-right font-medium ${lastToFirst ? 'text-amber-600' : 'text-gray-600'}`}>
                  {lastToFirst ? '最后→第一' : '普通切换'}
                </span>
              </div>
            </div>
          </>
        )}

        {metrics.history.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div className="text-xs">
              <div className="text-gray-500 mb-1">历史（最近 5 次）</div>
              <div className="space-y-0.5 font-mono">
                {metrics.history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span>{h.durationMs}ms</span>
                    <span>{h.avgFps} fps</span>
                    <span className={h.frameDrops > 0 ? 'text-amber-600' : ''}>
                      {h.frameDrops} 掉帧
                    </span>
                    {h.isLastToFirst && <span className="text-amber-600">末→首</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        </>
        ) : (
        <p className="text-xs text-gray-500">首页可切换「未优化/已优化」对比轮播、懒加载、骨架屏等</p>
        )}

        <hr className="border-gray-100" />
        <button
          type="button"
          onClick={() => {
            const last = metrics.lastTransition;
            const text = [
              `模式: ${isLegacy ? '未优化' : '已优化'}（懒加载、骨架屏、虚拟列表等）`,
              `路由: ${pageMetrics.currentRoute || location.pathname}`,
              `FCP: ${pageMetrics.fcp != null ? pageMetrics.fcp + 'ms' : '—'}`,
              `LCP: ${pageMetrics.lcp != null ? pageMetrics.lcp + 'ms' : '—'}`,
              `路由切换: ${pageMetrics.routeChangeMs != null ? pageMetrics.routeChangeMs + 'ms' : '—'}`,
              `JS已加载: ${pageMetrics.jsSize > 0 ? pagePerf.formatBytes(pageMetrics.jsSize) : '—'}`,
              `JS Bundle: ${pageMetrics.buildSize != null ? pagePerf.formatBytes(pageMetrics.buildSize) : '—'}`,
              isHomePage && last ? `轮播: ${last.durationMs}ms, ${last.avgFps}fps` : '',
              `FPS: ${metrics.fps}`,
            ].filter(Boolean).join('\n');
            navigator.clipboard?.writeText(text).then(() => {
              setCopyStatus('已复制');
              setTimeout(() => setCopyStatus(''), 1500);
            });
          }}
          className="w-full py-2 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          {copyStatus || '复制指标'}
        </button>
      </div>
    </div>
  );
}
