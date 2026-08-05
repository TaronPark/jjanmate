'use client';

import { useState } from 'react';

// 시안 화면 5의 carousel-container 대응. 기존엔 대표 이미지 1장만 보여주던 것을 실제
// 다중 이미지 캐러셀(점 인디케이터 + 장수 카운트 + 좌우 탭 영역)로 교체.
// 수정요청사항(2026-08-05, p.5-6 ②): 피드 카드(PostCard) 안에서도 이 컴포넌트를 재사용해
// 클릭 없이 좌우로 스와이프하며 이미지를 볼 수 있게 했다 — 피드 카드는 전체가 <Link>로
// 감싸여 있어서, 좌우 넘김/점 인디케이터 클릭이 그대로 버블링되면 게시글 상세로 이동해버린다.
// 그래서 이 버튼들만 stopPropagation으로 막아 상세 화면(Link로 안 감싸인 컨텍스트)에서는
// 기존과 동일하게, 피드 카드 안에서는 넘김 조작만 독립적으로 동작하게 한다.
export default function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const go = (delta: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          <button className="carousel-nav prev" onClick={(e) => go(-1, e)} aria-label="이전 이미지" />
          <button className="carousel-nav next" onClick={(e) => go(1, e)} aria-label="다음 이미지" />
          <div className="carousel-dots">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
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
