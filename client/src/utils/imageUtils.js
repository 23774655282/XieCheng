/**
 * 获取图片文件的宽高（用于上传前校验，保证放大后不模糊）
 */
export const MIN_RECOMMENDED_LONG_EDGE = 1200;

export function getImageDimensions(file) {
  if (!file || !file.type.startsWith('image/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * 检查图片是否达到推荐分辨率（长边 >= MIN_RECOMMENDED_LONG_EDGE）
 */
export function checkImageResolution(file, onTooSmall) {
  getImageDimensions(file).then((dim) => {
    if (!dim) return;
    const longEdge = Math.max(dim.width, dim.height);
    if (longEdge < MIN_RECOMMENDED_LONG_EDGE && typeof onTooSmall === 'function') {
      onTooSmall(dim, longEdge);
    }
  });
}
