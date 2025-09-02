import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sackboy Studio',
  description: 'Turn your photo into a cozy knitted burlap plush craft scene',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
