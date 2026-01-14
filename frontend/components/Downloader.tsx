import Downloader from "@/components/Downloader";

export const metadata = {
  metadataBase: new URL("https://downloadytvideo.vercel.app"),

  title:
    "Download YT Video Online | Free & Fast YouTube Video Downloader (1080p MP4)",
  description:
    "Download YT videos online in 1080p, 720p MP4 and audio fast & free. No ads, no limits. The most lightweight and clean YT video downloader.",

  keywords: [
    "download yt video",
    "yt video downloader",
    "download youtube video",
    "youtube downloader",
    "download yt 1080p",
    "yt mp4 download",
    "youtube video download online",
    "yt shorts downloader",
    "youtube video save",
  ],

  alternates: {
    canonical: "https://downloadytvideo.vercel.app",
  },

  openGraph: {
    title:
      "Download YT Video Online | Fast & Free YouTube Video Downloader (1080p)",
    description:
      "Free & fast YT video downloader to save YouTube videos in 1080p, 720p MP4 and audio formats.",
    url: "https://downloadytvideo.vercel.app",
    siteName: "DownloadYTVideo",
    images: ["/og.png"],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Download YT Video Online | Fast YouTube Video Downloader (1080p MP4)",
    description:
      "Minimal, fast & free YT video downloader with 1080p MP4 support.",
    images: ["/og.png"],
  },

  // 🔥 Preconnect to backend API
  other: {
    "link:preconnect": "https://safe-bidget-sachinpal11-7247ff8d.koyeb.app",
  },

  // 🔥 JSON-LD Schema for Google Ranking
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "DownloadYTVideo",
        applicationCategory: "VideoDownloader",
        operatingSystem: "All",
        url: "https://downloadytvideo.vercel.app",
        offers: {
          "@type": "Offer",
          price: "0.00",
          priceCurrency: "USD",
        },
        description:
          "Free online YT video downloader supporting 1080p, 720p MP4 formats with fast speed.",
      }),
    },
  ],
};

// -------------------------------
// PAGE COMPONENT
// -------------------------------
export default function Home() {
  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center px-4">
      {/* HERO SECTION */}
      <section className="pt-28 pb-10 text-center max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Download <span className="text-red-500">YT Videos</span> Online
        </h1>

        <h2 className="mt-4 text-gray-300 text-lg font-medium">
          Free 1080p MP4 YouTube Video Downloader
        </h2>

        <p className="mt-3 text-gray-400 text-base">
          Fast, clean and ad-free YouTube video downloader.
        </p>
      </section>

      {/* DOWNLOADER UI */}
      <Downloader />

      {/* FOOTER */}
      <footer className="mt-20 pb-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} DownloadYTVideo — Fast YT Video Downloader
      </footer>
    </main>
  );
}
