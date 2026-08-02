import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '짠메이트',
  description: '룸과 플레어로 나뉜 절약 이야기를 업보트·다운보트로 함께 나누는 커뮤니티',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
