import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sackboy Studio - Craft Your LittleBigPlanet Adventure',
  description: 'Transform your photos into magical knitted burlap plush craft scenes inspired by the whimsical world of Sackboy and LittleBigPlanet. Create, customize, and share your own cozy craft adventures!',
  keywords: 'Sackboy, LittleBigPlanet, craft, knitted, burlap, plush, photo transformation, creative studio',
  authors: [{ name: 'Sackboy Studio' }],
  openGraph: {
    title: 'Sackboy Studio - Craft Your LittleBigPlanet Adventure',
    description: 'Transform your photos into magical knitted burlap plush craft scenes inspired by Sackboy and LittleBigPlanet',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sackboy Studio - Craft Your LittleBigPlanet Adventure',
    description: 'Transform your photos into magical knitted burlap plush craft scenes inspired by Sackboy and LittleBigPlanet',
  },
  icons: {
    icon: '/favicon.webp',
    apple: '/favicon.webp',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#FF8C00',
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
      <html lang="en">
      <head>
        {/* Preload Google Fonts for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Add some LittleBigPlanet-inspired meta tags */}
        <meta name="theme-color" content="#FF8C00" />
        <meta name="color-scheme" content="dark" />

        {/* Structured data for better SEO */}
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "Sackboy Studio",
                "description": "Transform your photos into magical knitted burlap plush craft scenes inspired by Sackboy and LittleBigPlanet",
                "url": "https://www.sackboy-studio.xyz",
                "applicationCategory": "CreativeApplication",
                "operatingSystem": "Web Browser",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              })
            }}
        />
      </head>
      <body className="craft-texture">
      {/* Background decorative elements inspired by LittleBigPlanet */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Floating craft elements */}
        <div className="absolute top-10 left-10 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full opacity-15 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 right-1/3 w-4 h-4 bg-gradient-to-br from-red-400 to-orange-500 rounded-full opacity-25 animate-pulse" style={{animationDelay: '0.5s'}}></div>

        {/* Subtle craft pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23FF8C00' fill-opacity='0.1'%3E%3Cpath d='M50 50m-20 0a20 20 0 1 1 40 0a20 20 0 1 1 -40 0'/%3E%3Cpath d='M20 20m-10 0a10 10 0 1 1 20 0a10 10 0 1 1 -20 0'/%3E%3Cpath d='M80 80m-10 0a10 10 0 1 1 20 0a10 10 0 1 1 -20 0'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>
      </div>

      {/* Main content with proper z-index */}
      <div className="relative z-10">
        {children}
      </div>
      </body>
      </html>
  )
}
