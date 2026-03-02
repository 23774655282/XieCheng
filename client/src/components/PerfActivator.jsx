import { usePerf } from '../context/PerfContext';

/**
 * 性能模式切换按钮 - 切换未优化/已优化（懒加载、骨架屏、虚拟列表等）
 * 指标默认在控制台输出，无需点击开启
 */
export function PerfActivator() {
  const { isUnoptimizedMode, toggleUnoptimizedMode } = usePerf();

  if (import.meta.env.PROD && import.meta.env.VITE_PERF_ACTIVATOR !== '1') return null;

  return (
    <button
      type="button"
      onClick={toggleUnoptimizedMode}
      className="fixed bottom-4 right-4 z-[9997] px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/90 text-white shadow-lg hover:bg-gray-700 transition-colors"
      title={isUnoptimizedMode ? '切换为已优化模式' : '切换为未优化模式'}
      aria-label={isUnoptimizedMode ? '已优化' : '未优化'}
    >
      {isUnoptimizedMode ? '未优化' : '已优化'}
    </button>
  );
}
