import { useLocation } from 'react-router-dom';
import { usePerf } from '../context/PerfContext';

/**
 * 性能模式切换按钮 - 切换未优化/已优化（懒加载、骨架屏、虚拟列表等）
 * 在旅行地图页额外显示「视口地图/全量地图」切换，用于 TBT 对比测试
 */
export function PerfActivator() {
  const location = useLocation();
  const { isUnoptimizedMode, toggleUnoptimizedMode, isViewportMap, toggleViewportMap } = usePerf();
  const isTravelMap = location.pathname === '/travel-map';

  if (import.meta.env.PROD && import.meta.env.VITE_PERF_ACTIVATOR !== '1') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9997] flex flex-col gap-2 items-end">
      <button
        type="button"
        onClick={toggleUnoptimizedMode}
        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/90 text-white shadow-lg hover:bg-gray-700 transition-colors"
        title={isUnoptimizedMode ? '切换为已优化模式' : '切换为未优化模式'}
        aria-label={isUnoptimizedMode ? '已优化' : '未优化'}
      >
        {isUnoptimizedMode ? '未优化' : '已优化'}
      </button>
      {isTravelMap && (
        <button
          type="button"
          onClick={toggleViewportMap}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/90 text-white shadow-lg hover:bg-gray-700 transition-colors"
          title={isViewportMap ? '切换为全量加载（用于 TBT 对比）' : '切换为按视口加载'}
          aria-label={isViewportMap ? '视口地图' : '全量地图'}
        >
          {isViewportMap ? '视口地图' : '全量地图'}
        </button>
      )}
    </div>
  );
}
