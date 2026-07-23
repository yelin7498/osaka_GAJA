import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '가족여행 플래너',
  description: '여행 일정을 함께 만들고 편집하고 공유하세요.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Noto+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
