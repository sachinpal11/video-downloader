import { FormatQuality } from "../types";

export function sortByQuality(qualities: FormatQuality[]): FormatQuality[] {
  return qualities.sort((a, b) => {
    const aHeight = parseInt(a.quality);
    const bHeight = parseInt(b.quality);
    return bHeight - aHeight;
  });
}

export function filterByExt(formats: any[], ext: string): any[] {
  return formats.filter((f) => f.ext === ext);
}

export function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null;
  
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}
