'use client';

import { useState } from 'react';

// 시안 화면 5의 carousel-container 대응. 기존엔 대표 이미지 1장만 보여주던 것을 실제
// 다중 이미지 캐러셀(점 인디케이터 + 장수 카운트 + 좌우 탭 영역)로 교체.
export default function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  return (
    <div className="carousel-container">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt={`첨부 이미지 ${index + 1}`} />
      {images.length > 1 && (
        <>
          <div className="carousel-count">
            {index + 1}/{images.length}
          </div>
          <button className="carousel-nav prev" onClick={() => go(-1)} aria-label="이전 이미지" />
          <button className="carousel-nav next" onClick={() => go(1)} aria-label="다음 이미지" />
          <div className="carousel-dots">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}번째 이미지로 이동`}
                className={`dot${i === index ? ' active' : ''}`}
                style={{ padding: 0, border: 'none' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
