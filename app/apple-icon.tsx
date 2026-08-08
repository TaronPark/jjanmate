import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111111',
        }}
      >
        <div style={{ fontSize: 105, fontWeight: 700, color: '#e6a822', fontFamily: 'sans-serif' }}>
          짠
        </div>
      </div>
    ),
    { ...size }
  );
}
