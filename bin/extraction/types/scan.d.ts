import {SwerrConfig} from "../../core/interfaces/swerr-config.js";
import {ErrorClassDetectorContext} from "./jsdoc.js";

export type ScanResult = {
    rootDir: string;
    blocks: JsdocBlock[];
    scannedFiles: number;
    skippedFiles: number;
};

export type ScanOptions = SwerrConfig["sourceFile"]["options"] & {
    /**
     * Custom function to determine if a JSDoc block represents an error class.
     * If not provided, defaults to checking for the @error tag.
     *
     * @param ctx - Context object containing jsDocTags, fileName, fileContent, and the block itself
     * @returns true if the block represents an error class, false otherwise
     */
    errorClassDetector?: (ctx: ErrorClassDetectorContext) => boolean;
}
