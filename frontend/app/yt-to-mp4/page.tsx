import Downloader from "@/components/Downloader";
import { SITE_URL } from "@/lib/env";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "YT to MP4 Converter | Free YouTube to MP4 Downloader",
  description:
    "Convert any YouTube video to MP4 instantly in HD quality. Fast YT to MP4 downloader, free and lightweight.",
  alternates: {
    canonical: `${SITE_URL}/yt-to-mp4`,
  },
  openGraph: {
    title: "YT to MP4 Converter | Fast YouTube MP4 Downloader",
    description: "Convert YouTube videos to MP4 in seconds.",
    url: `${SITE_URL}/yt-to-mp4`,
    images: [`${SITE_URL}/og.png`],
  },
};

export default function YTtoMP4() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4">
      <section className="pt-28 pb-10 text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          YT to <span className="text-red-500">MP4</span> Converter
        </h1>
        <p className="mt-4 text-gray-400 text-lg">
          Convert YouTube videos to MP4 format instantly, free and fast.
        </p>
      </section>

      <Downloader />

      <section className="mt-10 max-w-3xl text-gray-300 text-base leading-relaxed space-y-4">
        <h2 className="text-xl font-semibold text-white">Features:</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Fastest YT to MP4 conversion</li>
          <li>Supports HD formats (1080p/720p)</li>
          <li>One-click download</li>
          <li>No registration or ads</li>
        </ul>
      </section>

      <footer className="mt-20 pb-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} DownloadYTVideo — YT to MP4 Converter
      </footer>
    </main>
  );
}
