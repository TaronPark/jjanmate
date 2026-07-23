import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '짠메이트',
  description: '나와 같은 상황인 사람을 AI로 찾아주는 절약 챌린지 커뮤니티',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
