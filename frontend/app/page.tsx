import Downloader from "@/components/Downloader";

export const metadata = {
  title: "Download YT Video Online | Fast YouTube Video Downloader (1080p MP4)",
  description:
    "Download YouTube videos online in 1080p and 720p MP4 formats. Fast, free and ad-free YT video downloader.",
};

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
          Fast, clean and ad-free YouTube downloader that supports HD video
          formats.
        </p>
      </section>

      {/* DOWNLOADER */}
      <Downloader />

      {/* FOOTER */}
      <footer className="mt-20 pb-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} DownloadYTVideo — Fast YT Video Downloader
      </footer>
    </main>
  );
}
