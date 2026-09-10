import type {ErrorBlockDetector, SwerrConfig} from "../../config-schema.js";
import type {JsdocBlock} from "./jsdoc.js";

export type ScanResult = {
    rootDir: string;
    blocks: JsdocBlock[];
    scannedFiles: number;
    skippedFiles: number;
};

export type ScanOptions = Partial<Pick<
    SwerrConfig["scan"],
    "ignoredDirectories" | "includeExtensions" | "maxFileSizeBytes"
>> & {
    /**
     * Custom function to determine if a JSDoc block represents an error.
     */
    errorBlockDetector?: ErrorBlockDetector;
    /** @deprecated Use ignoredDirectories instead. */
    ignoreDirs?: string[];
    /** @deprecated Use includeExtensions instead. */
    whitelistExtensions?: string[];
    /** @deprecated Use errorBlockDetector instead. */
    errorClassDetector?: ErrorBlockDetector;
};
