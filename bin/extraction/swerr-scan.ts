import { promises as fs, Dirent } from "node:fs";
import * as path from "node:path";
import {JsdocBlock, JsdocTag, ErrorClassDetectorContext} from "./types/jsdoc.js";
import {ScanOptions, ScanResult} from "./types/scan.js";
import {DEFAULT_IGNORE_DIRS, DEFAULT_MAX_FILE_SIZE} from "../config.js";
import {LogUtils} from "@swerr/core";

function isProbablyTextFileByExt(filePath: string, exts?: string[]): boolean {
    exts = exts?.map(e => e.toLowerCase());
    if (!exts || exts.length === 0) return true;
    const ext = path.extname(filePath).toLowerCase();
    return exts.includes(ext);
}

async function* walkDir(root: string, opts: ScanOptions): AsyncGenerator<string> {
    const ignoreDirs = [...DEFAULT_IGNORE_DIRS, ...(opts?.ignoreDirs || [])].reduce((set, dir) => set.add(dir), new Set<string>());

    const stack: string[] = [root];
    while (stack.length) {
        const current = stack.pop()!;
        let entries: Dirent[];
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const ent of entries) {
            const full = path.join(current, ent.name);
            if (ent.isDirectory()) {
                if (!ignoreDirs.has(ent.name)) stack.push(full);
            } else if (ent.isFile()) {
                yield full;
            }
        }
    }
}

/**
 * Extract all JSDoc blocks from a file's text.
 * Matches /** ... *\/ including multiline.
 */
function findJsdocBlocks(text: string): Array<{ raw: string; index: number }> {
    const blocks: Array<{ raw: string; index: number }> = [];
    const re = /\/\*\*[\s\S]*?\*\//g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        blocks.push({ raw: m[0], index: m.index });
    }
    return blocks;
}

/**
 * Convert a character index to a 1-based line number.
 * Uses a precomputed array of newline indices for speed.
 */
function indexToLine(index: number, newlineIdx: number[]): number {
    // number of newlines strictly before index + 1
    // binary search
    let lo = 0;
    let hi = newlineIdx.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (newlineIdx[mid] < index) lo = mid + 1;
        else hi = mid;
    }
    return lo + 1;
}

function collectNewlineIndices(text: string): number[] {
    const out: number[] = [];
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10) out.push(i); // '\n'
    }
    return out;
}

/**
 * Clean a JSDoc block into "content lines":
 * - strips starting "/**" and ending "*"
* - strips leading "*" and one optional whitespace
*/
function normalizeJsdocContentLines(rawBlock: string): string[] {
    // Remove delimiters
    let inner = rawBlock.replace(/^\/\*\*\s?/, "").replace(/\*\/\s*$/, "");
    // Keep original line breaks
    const lines = inner.split(/\r?\n/);

    return lines.map((line) => {
        // Remove leading whitespace then optional '*'
        const trimmedLeft = line.replace(/^\s*/, "");
        if (trimmedLeft.startsWith("*")) {
            return trimmedLeft.replace(/^\*\s?/, "");
        }
        return trimmedLeft;
    });
}

type ParsedBlock = { description: string; tags: JsdocTag[] };

/**
 * Parse a normalized JSDoc content (lines with "*" removed).
 * Rules:
 * - description = all non-tag lines before first @tag (blank lines allowed)
 * - tags = each "@name ..." starts a tag; indented continuation lines attach to current tag
 */
function parseNormalizedJsdocLines(lines: string[]): ParsedBlock {
    const descLines: string[] = [];
    const tags: JsdocTag[] = [];
    
    let inTags = false;
    let currentTag: JsdocTag | null = null;

    const pushCurrent = () => {
        if (currentTag) {
            currentTag.raw = currentTag.raw.trimEnd();
            const m = currentTag.raw.match(/^\s*(\{[^}]+\})\s*(.*)$/);
            if (m) {
                const [, typeDecl, rest] = m;
                currentTag.raw = rest;
            }

            tags.push(currentTag);
            currentTag = null;
        }
    };

    for (const line of lines) {
        const isTagLine = line.trimStart().startsWith("@");

        if (!inTags) {
            if (isTagLine) {
                inTags = true;
            } else {
                descLines.push(line);
                continue;
            }
        }

        if (isTagLine) {
            pushCurrent();
            const tagMatch = line.trimStart().match(/^@([A-Za-z0-9_\-]+)\s*(.*)$/);
            if (!tagMatch) {
                descLines.push(line);
                inTags = false;
                continue;
            }
            const [, name, rest] = tagMatch;
            currentTag = { name, raw: rest ?? "" };
        } else {
            if (currentTag) {
                const cont = line.length ? line : "";
                currentTag.raw += "\n" + cont;
            } else {
                descLines.push(line);
            }
        }
    }

    pushCurrent();

    const description = descLines
        .join("\n")
        .replace(/[ \t]+\n/g, "\n")
        .trim();

    return { description, tags };
}

async function readTextFileIfEligible(filePath: string, opts: ScanOptions): Promise<string | null> {
    if (!isProbablyTextFileByExt(filePath, opts?.whitelistExtensions)) return null;

    let stat;
    try {
        stat = await fs.stat(filePath);
    } catch {
        return null;
    }

    if (stat.size > DEFAULT_MAX_FILE_SIZE) return null;

    try {
        return await fs.readFile(filePath, "utf8");
    } catch {
        return null;
    }
}

export async function scanJsdocs(rootDir: string, options: ScanOptions): Promise<ScanResult> {
    const blocks: JsdocBlock[] = [];
    let scannedFiles = 0;
    let skippedFiles = 0;

    LogUtils.info(`Scanning directory: ${rootDir}`);

    for await (const filePath of walkDir(rootDir, options)) {
        const text = await readTextFileIfEligible(filePath, options);
        if (text == null) {
            skippedFiles++;
            continue;
        }
        scannedFiles++;
        LogUtils.debug(`Scanned file with JSDoc: ${filePath}`);

        const newlineIdx = collectNewlineIndices(text);
        const found = findJsdocBlocks(text);
        const fileName = path.basename(filePath);

        for (const b of found) {
            const startLine = indexToLine(b.index, newlineIdx);
            const lines = normalizeJsdocContentLines(b.raw);
            const parsed = parseNormalizedJsdocLines(lines);

            const block: JsdocBlock = {
                filePath,
                startLine,
                raw: b.raw,
                description: parsed.description,
                tags: parsed.tags,
            };

            // Apply custom error class detector if provided
            if (options.errorClassDetector) {
                const ctx: ErrorClassDetectorContext = {
                    jsDocTags: block.tags,
                    fileName,
                    fileContent: text,
                    block,
                };

                if (options.errorClassDetector(ctx)) {
                    blocks.push(block);
                } else {
                    LogUtils.debug(`Custom detector: Skipping JSDoc block in ${filePath} at line ${startLine}`);
                }
            } else {
                // Default behavior: include all blocks (filtering happens in translate-to-source-scheme)
                blocks.push(block);
            }
        }
    }

    return { rootDir, blocks, scannedFiles, skippedFiles };
}