/**
 * 虚拟列表性能指标 - 用于量化优化前后对比
 * 通过 ?perf=1 启用，?legacy=1 使用非虚拟列表
 */

const TARGET_FPS = 60;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;

export const virtualListPerf = {
  /** 是否虚拟列表模式 */
  isVirtual: false,
  /** 房间总数 */
  totalCount: 0,
  /** 实际渲染的 DOM 行数 */
  renderedRows: 0,
  /** 首次渲染耗时 ms */
  firstRenderMs: null,
  /** 滚动时 FPS */
  scrollFps: 0,
  /** 滚动掉帧数 */
  scrollFrameDrops: 0,
  /** 最近一次测量的滚动 FPS */
  lastScrollFps: 0,
  _frameTimes: [],
  _lastScrollTime: 0,
  _notify: null,

  /** 记录列表首次渲染完成 */
  recordFirstRender(totalCount, renderedRows, startTime) {
    this.totalCount = totalCount;
    this.renderedRows = renderedRows;
    this.firstRenderMs = Math.round(performance.now() - startTime);
    console.log('[virtualListPerf] recordFirstRender', { totalCount, renderedRows, firstRenderMs: this.firstRenderMs, isVirtual: this.isVirtual });
    this._notify?.();
  },

  /** 滚动时记录帧（由 rAF 循环调用） */
  recordScrollFrame(deltaMs) {
    this._frameTimes.push(deltaMs);
    if (deltaMs > FRAME_BUDGET_MS) this.scrollFrameDrops += 1;
    if (this._frameTimes.length > 30) {
      const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
      this.lastScrollFps = avg > 0 ? Math.round(1000 / avg) : 0;
      this._frameTimes = [];
      this.scrollFrameDrops = 0;
      this._notify?.();
    }
  },

  /** 开始滚动测量 */
  startScrollMeasure() {
    this._frameTimes = [];
    this.scrollFrameDrops = 0;
  },

  /** 获取表格 tbody 中的 tr 数量 */
  countRenderedRows(containerSelector = '[data-room-list-tbody]') {
    try {
      const tbody = document.querySelector(containerSelector);
      return tbody ? tbody.querySelectorAll('tr').length : 0;
    } catch {
      return 0;
    }
  },

  reset() {
    this.firstRenderMs = null;
    this.renderedRows = 0;
    this.lastScrollFps = 0;
    this._frameTimes = [];
    this.scrollFrameDrops = 0;
  },

  subscribe(cb) {
    this._notify = cb;
    return () => { this._notify = null; };
  },
};
