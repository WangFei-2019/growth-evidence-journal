import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '成长证据簿 · 每一步都有迹可循', description: '收集工作碎片，整理真实证据，看见自己的成长。', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
