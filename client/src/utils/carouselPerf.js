/**
 * 轮播性能指标收集器 - 用于定量对比优化前后
 * 通过 ?perf=1 启用，?legacy=1 切换旧版逻辑
 */

const TARGET_FPS = 60;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;

export const carouselPerf = {
  /** 当前实时 FPS */
  currentFps: 0,
  /** 最近一次切换的指标 */
  lastTransition: null,
  /** 历史切换记录（最近 20 次） */
  history: [],
  /** 是否为旧版模式（最后→第一的大跳转） */
  isLegacyMode: false,

  /** 记录切换开始 */
  recordTransitionStart(fromIndex, toIndex, isLegacyMode) {
    this.isLegacyMode = isLegacyMode;
    this.lastTransition = {
      fromIndex,
      toIndex,
      isLastToFirst: isLegacyMode ? fromIndex === 4 && toIndex === 0 : false,
      startTime: performance.now(),
      frameTimes: [],
      frameDrops: 0,
    };
  },

  /** 记录切换结束（由 transitionend 触发） */
  recordTransitionEnd() {
    if (!this.lastTransition) return;
    const t = this.lastTransition;
    t.endTime = performance.now();
    t.durationMs = Math.round(t.endTime - t.startTime);
    const validTimes = t.frameTimes.filter((x) => x > 0);
    const avgMs = t.frameTimes.length > 0 ? t.frameTimes.reduce((a, b) => a + b, 0) / t.frameTimes.length : 0;
    t.avgFps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
    t.minFps = validTimes.length > 0 ? Math.round(1000 / Math.max(...validTimes)) : 0;
    t.maxFps = validTimes.length > 0 ? Math.round(1000 / Math.min(...validTimes)) : 0;
    this.history.unshift({ ...t });
    if (this.history.length > 20) this.history.pop();
    this._notify?.();
  },

  /** 在切换过程中记录每帧耗时（由 FPS 计数器调用） */
  recordFrame(deltaMs) {
    if (!this.lastTransition || this.lastTransition.endTime) return;
    this.lastTransition.frameTimes.push(deltaMs);
    if (deltaMs > FRAME_BUDGET_MS) this.lastTransition.frameDrops += 1;
  },

  /** 订阅更新（用于 React 组件重绘） */
  _notify: null,
  subscribe(cb) {
    this._notify = cb;
    return () => { this._notify = null; };
  },

  /** 重置 */
  reset() {
    this.lastTransition = null;
    this.history = [];
    this.currentFps = 0;
  },
};
