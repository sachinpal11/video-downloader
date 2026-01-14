import Downloader from "@/components/Downloader";
import { SITE_URL } from "@/lib/env";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "YouTube Shorts Downloader | Download Shorts Video",
  description:
    "Download YouTube Shorts instantly in HD MP4. Fast, free, and no watermark Shorts downloader.",
  alternates: {
    canonical: `${SITE_URL}/youtube-shorts-downloader`,
  },
  openGraph: {
    title: "YouTube Shorts Downloader | Fast Shorts MP4 Download",
    description: "Save YouTube Shorts in HD instantly.",
    url: `${SITE_URL}/youtube-shorts-downloader`,
    images: [`${SITE_URL}/og.png`],
  },
};

export default function ShortsDownloader() {
  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center px-4">
      <section className="pt-28 pb-10 text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          YouTube <span className="text-red-500">Shorts</span> Downloader
        </h1>
        <p className="mt-4 text-gray-400 text-lg">
          Download YouTube Shorts in HD MP4 quickly and free.
        </p>
      </section>

      <Downloader />

      <section className="mt-10 max-w-3xl text-gray-300 text-base leading-relaxed space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Why Our Shorts Downloader?
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Instant Shorts download</li>
          <li>HD MP4 support</li>
          <li>No watermark</li>
          <li>Works on mobile & desktop</li>
        </ul>
      </section>

      <footer className="mt-20 pb-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} DownloadYTVideo — Shorts Downloader
      </footer>
    </main>
  );
}
