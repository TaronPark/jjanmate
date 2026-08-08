// 임시 PWA 아이콘 생성 스크립트 — 정식 브랜드 아이콘이 준비되면 이 스크립트와
// public/icons/*.png는 삭제하고 실제 디자인 파일로 교체할 것.
// 실행: node scripts/generate-pwa-icons.mjs
import { ImageResponse } from 'next/og.js';
import { createElement } from 'react';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const OUT_DIR = path.resolve(process.cwd(), 'public/icons');

function icon(size, { maskable = false } = {}) {
  // maskable 아이콘은 OS가 원형/스퀴클 등으로 잘라내므로, 로고를 중앙 안전영역(약 66%) 안에 배치.
  const glyphSize = maskable ? Math.round(size * 0.5) : Math.round(size * 0.6);
  const el = createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111111',
      },
    },
    createElement(
      'div',
      {
        style: {
          fontSize: glyphSize,
          fontWeight: 700,
          color: '#e6a822',
          fontFamily: 'sans-serif',
        },
      },
      '짠'
    )
  );
  return new ImageResponse(el, { width: size, height: size });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const targets = [
    { file: 'icon-192.png', size: 192, maskable: false },
    { file: 'icon-512.png', size: 512, maskable: false },
    { file: 'icon-512-maskable.png', size: 512, maskable: true },
  ];

  for (const t of targets) {
    const res = icon(t.size, { maskable: t.maskable });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT_DIR, t.file), buf);
    console.log(`wrote ${t.file} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
