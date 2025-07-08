// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Influence Map',
  description: 'Visualize global influence dynamics over time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans">{children}</body>
    </html>
  );
}

