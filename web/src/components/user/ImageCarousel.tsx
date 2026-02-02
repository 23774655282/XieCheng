/**
 * 用户端 - 详情页 Banner 轮播（从 API 获取图片）
 */
import { useEffect, useState } from 'react';
import { hotelsApi } from '../../api';

interface ImageCarouselProps {
  hotelId?: string;
}

export default function ImageCarousel({ hotelId }: ImageCarouselProps) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!hotelId) return;
    hotelsApi
      .detail(hotelId)
      .then((res) => {
        if (res.code === 0 && res.data?.images?.length) {
          setImages(res.data.images);
        }
      })
      .catch(() => {});
  }, [hotelId]);

  if (images.length === 0) {
    return (
      <div
        className="image-carousel"
        style={{
          height: 200,
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
        }}
      >
        暂无图片
      </div>
    );
  }

  return (
    <div className="image-carousel" style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
      <img
        src={images[index]}
        alt=""
        style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 4,
            }}
          >
            {images.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
