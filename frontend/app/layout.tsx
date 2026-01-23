import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins } from "next/font/google";
import "./globals.css";

// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// viewport
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

// SEO metadata
export const metadata: Metadata = {
  title: {
    default: "DownloadYTVideo — Fast YouTube Downloader",
    template: "%s | DownloadYTVideo",
  },
  description:
    "Free YouTube video downloader supporting 1080p & MP4 downloads.",
  icons: {
    icon: "/favicon.ico",
  },
};

// Required for custom <head> in App Router
// export function Head() {
//   return (
//     <>
//       {/* PRELOAD FONT */}
//       <link
//         rel="preload"
//         href="/fonts/poppins.woff2"
//         as="font"
//         type="font/woff2"
//         crossOrigin="anonymous"
//       />

//       {/* PRECONNECT BACKEND */}
//       <link
//         rel="preconnect"
//         href="https://safe-bidget-sachinpal11-7247ff8d.koyeb.app"
//       />
//     </>
//   );
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body
        className={`
          bg-neutral-900 
          text-white 
          antialiased
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${poppins.variable}
        `}
      >
        {/* JSON-LD (safe inside body) */}
        {/* <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "DownloadYTVideo",
              operatingSystem: "All",
              applicationCategory: "VideoDownloader",
              url: process.env.NEXT_PUBLIC_SITE_URL,
              offers: {
                "@type": "Offer",
                price: "0.00",
                priceCurrency: "USD",
              },
            }),
          }}
        /> */}

        {children}
      </body>
    </html>
  );
}
