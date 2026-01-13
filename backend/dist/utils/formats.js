"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortByQuality = sortByQuality;
exports.filterByExt = filterByExt;
exports.formatFileSize = formatFileSize;
function sortByQuality(qualities) {
    return qualities.sort((a, b) => {
        const aHeight = parseInt(a.quality);
        const bHeight = parseInt(b.quality);
        return bHeight - aHeight;
    });
}
function filterByExt(formats, ext) {
    return formats.filter((f) => f.ext === ext);
}
function formatFileSize(bytes) {
    if (!bytes)
        return null;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}
