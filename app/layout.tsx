import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'ヘーゼルナッツ農園管理システム',
  description: 'ヘーゼルナッツ農園の樹木管理・会計システム',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '農園台帳',
  },
};

export const viewport = {
  themeColor: '#14532d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 h-screen flex flex-col overflow-hidden">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
