import { useState, useEffect, useRef } from 'react';
import { usePerf } from '../context/PerfContext';
import { virtualListPerf } from '../utils/virtualListPerf';

/**
 * 列表性能监控 - 量化优化前后对比
 * 启用：点击右下角 Perf 按钮
 * @param {Object} props
 * @param {string} [props.itemLabel='房间'] - 条目名称，如 "房间" | "酒店"
 * @param {string} [props.modeType='virtual'] - "virtual" 虚拟列表 | "lazy" 懒加载
 * @param {boolean} [props.useWindowScroll=false] - 使用 window 监听滚动（酒店列表页面滚动）
 */
export function VirtualListPerformanceMonitor({ itemLabel = '房间', modeType = 'virtual', useWindowScroll = false }) {
  const { isPerfMode: show, isLegacyList: isLegacy, toggleLegacyList } = usePerf();

  const [metrics, setMetrics] = useState({
    totalCount: 0,
    renderedRows: 0,
    firstRenderMs: null,
    scrollFps: 0,
    scrollFrameDrops: 0,
  });
  const [copyStatus, setCopyStatus] = useState('');
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef(null);
  const scrollRef = useRef(false);

  useEffect(() => {
    if (!show) return;

    const updateMetrics = () => {
      setMetrics({
        totalCount: virtualListPerf.totalCount,
        renderedRows: virtualListPerf.renderedRows,
        firstRenderMs: virtualListPerf.firstRenderMs,
        scrollFps: virtualListPerf.lastScrollFps,
        scrollFrameDrops: virtualListPerf.scrollFrameDrops,
      });
    };

    const unsub = virtualListPerf.subscribe(updateMetrics);

    const measureScrollFps = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      if (scrollRef.current) {
        virtualListPerf.recordScrollFrame(delta);
      }
      rafRef.current = requestAnimationFrame(measureScrollFps);
    };

    rafRef.current = requestAnimationFrame(measureScrollFps);

    const onScroll = () => {
      scrollRef.current = true;
      virtualListPerf.startScrollMeasure();
    };
    const onScrollEnd = () => {
      scrollRef.current = false;
    };
    let scrollEndTimer;
    const handleScroll = () => {
      onScroll();
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(onScrollEnd, 150);
    };

    const scrollTarget = useWindowScroll ? window : document.querySelector('[data-room-list-scroll]');
    scrollTarget?.addEventListener?.('scroll', handleScroll, { passive: true });

    return () => {
      unsub();
      scrollTarget?.removeEventListener?.('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [show, useWindowScroll]);

  if (!show) return null;

  return (
    <div
      className="fixed top-4 left-4 z-[9998] w-80 rounded-lg border border-gray-300 bg-white/95 shadow-xl backdrop-blur-sm"
      aria-label="虚拟列表性能监控"
    >
      <div className="border-b border-gray-200 bg-blue-50 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-800">
          {modeType === 'lazy' ? '酒店列表性能' : '虚拟列表性能'}
          <button
            type="button"
            onClick={toggleLegacyList}
            className={`ml-2 rounded px-1.5 py-0.5 text-xs ${isLegacy ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} hover:opacity-80`}
            title={modeType === 'lazy' ? '切换普通列表/懒加载' : '切换普通列表/虚拟列表'}
          >
            {isLegacy ? '普通列表' : (modeType === 'lazy' ? '懒加载' : '虚拟列表')}
          </button>
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          点击右下角 Perf 按钮开关
        </p>
      </div>
      <div className="p-3 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-500">{itemLabel}总数</span>
          <span className="font-mono text-right">{metrics.totalCount}</span>
          <span className="text-gray-500">渲染数</span>
          <span className={`font-mono text-right font-medium ${!isLegacy && metrics.renderedRows < metrics.totalCount ? 'text-green-600' : ''}`}>
            {metrics.renderedRows}
            {!isLegacy && metrics.totalCount > 0 && (
              <span className="text-gray-400 ml-1">/ {metrics.totalCount}</span>
            )}
          </span>
          <span className="text-gray-500">首屏渲染</span>
          <span className="font-mono text-right">
            {metrics.firstRenderMs != null ? `${metrics.firstRenderMs} ms` : '—'}
          </span>
          <span className="text-gray-500">滚动 FPS</span>
          <span className={`font-mono text-right ${metrics.scrollFps >= 55 ? 'text-green-600' : metrics.scrollFps >= 30 ? 'text-amber-600' : 'text-gray-500'}`}>
            {metrics.scrollFps || '—'}
          </span>
        </div>

        {metrics.totalCount > 0 && (
          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
            {!isLegacy ? (
              modeType === 'lazy' ? (
                <>懒加载首屏渲染 <strong>{metrics.renderedRows}</strong> 个，触底加载更多</>
              ) : (
                <>虚拟列表仅渲染 <strong>{metrics.renderedRows}</strong> 个，节省 <strong>{Math.max(0, metrics.totalCount - metrics.renderedRows)}</strong> 个 DOM 节点</>
              )
            ) : (
              <>普通列表渲染全部 <strong>{metrics.totalCount}</strong> 个</>
            )}
          </div>
        )}

        <hr className="border-gray-100" />
        <button
          type="button"
          onClick={() => {
            const text = [
              `模式: ${isLegacy ? '普通列表' : (modeType === 'lazy' ? '懒加载' : '虚拟列表')}`,
              `${itemLabel}总数: ${metrics.totalCount}`,
              `渲染数: ${metrics.renderedRows}`,
              `首屏渲染: ${metrics.firstRenderMs != null ? metrics.firstRenderMs + 'ms' : '—'}`,
              `滚动FPS: ${metrics.scrollFps || '—'}`,
            ].join('\n');
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
