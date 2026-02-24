import { usePerf } from '../context/PerfContext';

/**
 * 性能监控激活按钮 - 点击切换监控面板
 * 仅在开发环境显示
 */
export function PerfActivator() {
  const { isPerfMode, setPerfMode } = usePerf();

  if (import.meta.env.PROD && import.meta.env.VITE_PERF_ACTIVATOR !== '1') return null;

  return (
    <button
      type="button"
      onClick={() => setPerfMode(!isPerfMode)}
      className="fixed bottom-4 right-4 z-[9997] px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/90 text-white shadow-lg hover:bg-gray-700 transition-colors"
      title={isPerfMode ? '关闭性能监控' : '开启性能监控'}
      aria-label={isPerfMode ? '关闭性能监控' : '开启性能监控'}
    >
      {isPerfMode ? 'Perf ✓' : 'Perf'}
    </button>
  );
}
