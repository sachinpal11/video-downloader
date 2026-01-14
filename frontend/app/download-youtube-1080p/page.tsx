import Downloader from "@/components/Downloader";
import { SITE_URL } from "@/lib/env";

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: "Download YouTube 1080p Videos | Full HD YT Downloader",
  description:
    "Free YouTube 1080p video downloader to save HD MP4 videos instantly. Fast, ad-free and lightweight YT HD downloader.",
  alternates: {
    canonical: `${SITE_URL}/download-youtube-1080p`,
  },
  openGraph: {
    title: "Download YouTube 1080p Videos | Full HD MP4 Downloader",
    description: "Free and fast 1080p YouTube video downloader.",
    url: `${SITE_URL}/download-youtube-1080p`,
    images: [`${SITE_URL}/og.png`],
  },
};

export default function Page1080p() {
  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center px-4">
      <section className="pt-28 pb-10 text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          Download YouTube <span className="text-red-500">1080p</span> Videos
        </h1>
        <p className="mt-4 text-gray-400 text-lg">
          Save YouTube videos in Full HD (1080p) MP4 format for free.
        </p>
      </section>

      <Downloader />

      <section className="mt-10 max-w-3xl text-gray-300 space-y-4 text-base leading-relaxed">
        <p>
          Download YouTube videos in crisp Full HD (1080p) quality without ads.
          Fast, lightweight, and secure.
        </p>

        <h2 className="text-xl font-semibold text-white">
          Why Use Our 1080p Downloader?
        </h2>

        <ul className="list-disc pl-6 space-y-2">
          <li>Supports high-quality MP4 downloads</li>
          <li>No ads, no login, no software</li>
          <li>Instant processing with minimal wait</li>
          <li>Works on all devices (Android, iOS, PC)</li>
        </ul>
      </section>

      <footer className="mt-20 pb-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} DownloadYTVideo — HD YouTube Downloader
      </footer>
    </main>
  );
}
