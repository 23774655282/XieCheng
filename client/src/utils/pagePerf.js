/**
 * 页面级性能指标 - FCP、LCP、JS 资源大小
 * 使用 Web Vitals 相关 API
 */

export const pagePerf = {
  fcp: null,
  lcp: null,
  jsTotalBytes: 0,
  jsFiles: [],
  /** 构建时 JS bundle 总大小（需先 npm run build） */
  buildTotalBytes: null,
  buildSizes: null,
  /** 最近一次路由切换耗时 ms */
  routeChangeMs: null,
  /** 当前路由 */
  currentRoute: '',
  _notify: null,

  /** 获取 FCP（首次内容绘制）- 优先从 getEntriesByType 读取 */
  getFCP() {
    try {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) return Math.round(fcpEntry.startTime);
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.domContentLoadedEventEnd) return Math.round(nav.domContentLoadedEventEnd);
      return null;
    } catch {
      return null;
    }
  },

  /** 使用 PerformanceObserver 监听 FCP（解决 getEntriesByType 在某些 SPA/浏览器中无值的问题） */
  observeFCP(onFCP) {
    try {
      if (!('PerformanceObserver' in window)) return () => {};
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.fcp = Math.round(entry.startTime);
            onFCP?.(this.fcp);
            this._notify?.();
            break;
          }
        }
      });
      observer.observe({ type: 'paint', buffered: true });
      return () => observer.disconnect();
    } catch {
      return () => {};
    }
  },

  /** 监听 LCP（最大内容绘制） */
  observeLCP(onLCP) {
    try {
      if (!('PerformanceObserver' in window)) return;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          this.lcp = Math.round(last.startTime);
          onLCP?.(this.lcp);
          this._notify?.();
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      return () => observer.disconnect();
    } catch {
      return () => {};
    }
  },

  /** 获取已加载的 JS 资源总大小（传输大小） */
  getJSSize() {
    try {
      const entries = performance.getEntriesByType('resource');
      const scripts = entries.filter((e) => e.initiatorType === 'script' || (e.name && e.name.endsWith('.js')));
      let total = 0;
      const files = [];
      scripts.forEach((e) => {
        const size = e.transferSize || e.encodedBodySize || 0;
        total += size;
        if (size > 0) {
          files.push({ name: e.name?.split('/').pop() || 'script', size });
        }
      });
      this.jsTotalBytes = total;
      this.jsFiles = files;
      return total;
    } catch {
      return 0;
    }
  },

  /** 获取构建时 bundle 大小（需先 npm run build 生成 public/bundle-size.json） */
  async fetchBuildSize() {
    try {
      const res = await fetch('/bundle-size.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        this.buildTotalBytes = data.total ?? null;
        this.buildSizes = data.sizes ?? null;
        this._notify?.();
      }
    } catch {}
    return this;
  },

  /** 记录路由切换耗时（在路由变化时调用，内部会等待 paint 后测量） */
  recordRouteChange(fromRoute, toRoute) {
    const start = performance.now();
    this.currentRoute = toRoute;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.routeChangeMs = Math.round(performance.now() - start);
        this._notify?.();
      });
    });
  },

  /** 收集所有指标 */
  collect() {
    this.fcp = this.getFCP();
    this.getJSSize();
    return this;
  },

  subscribe(cb) {
    this._notify = cb;
    return () => { this._notify = null; };
  },

  /** 格式化字节数 */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },
};
