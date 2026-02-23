import React, { useState, useEffect } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

/** 酒店展示图轮播，与 AllRooms 酒店卡片主图、HotelDetail 顶部 Banner 共用
 * onClick: 点击整个区域时调用（如跳转酒店详情）
 * onImageClick: 点击时传入当前图片 URL（如打开灯箱查看） */
export function HotelImageCarousel({ images, fallbackImage, className = '', imageClassName = 'min-h-[220px] md:min-h-[360px]', onClick, onImageClick }) {
  const imgs = Array.isArray(images) && images.length > 0 ? images : (fallbackImage ? [fallbackImage] : []);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (imgs.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 4000);
    return () => clearInterval(t);
  }, [imgs.length]);

  if (imgs.length === 0) return <div className={`bg-gray-200 ${className}`} />;

  const handleClick = onImageClick ? () => onImageClick(imgs[idx]) : onClick;
  const wrapperProps = handleClick
    ? { onClick: handleClick, role: 'button', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } } }
    : {};

  return (
    <div className={`relative overflow-hidden group ${handleClick ? 'cursor-pointer' : ''} ${className}`} {...wrapperProps}>
      <div className="flex h-full transition-transform duration-500 ease-out" style={{ width: `${imgs.length * 100}%`, transform: `translateX(-${idx * (100 / imgs.length)}%)` }}>
        {imgs.map((src, i) => (
          <img key={i} src={src} alt="" style={{ width: `${100 / imgs.length}%` }} className={`flex-shrink-0 h-full object-cover transition-transform duration-500 ease-out ${i === idx ? 'group-hover:scale-105' : ''} ${imageClassName}`} draggable={false} />
        ))}
      </div>
      {imgs.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + imgs.length) % imgs.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
            aria-label="上一张"
          >
            <IoChevronBack className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
            aria-label="下一张"
          >
            <IoChevronForward className="w-6 h-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imgs.map((_, i) => (
              <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-colors ${i === idx ? 'bg-white' : 'bg-white/60 hover:bg-white/80'}`} aria-label={`第${i + 1}张`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
