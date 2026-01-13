"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const logger = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    debug: (...args) => {
        if (process.env.NODE_ENV === "development") {
            console.log("[DEBUG]", ...args);
        }
    },
};
exports.logger = logger;
