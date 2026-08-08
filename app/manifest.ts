import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '짠메이트',
    short_name: '짠메이트',
    description: '룸과 플레어로 나뉜 절약 이야기를 업보트·다운보트로 함께 나누는 커뮤니티',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f4f6',
    theme_color: '#111111',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
