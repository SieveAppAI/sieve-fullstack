import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sieve AI — Regulatory Compliance',
  description:
    'AI-powered global regulatory compliance for CPG, supplements, and beauty brands',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
