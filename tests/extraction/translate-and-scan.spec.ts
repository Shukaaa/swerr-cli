// typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";

vi.mock("@swerr/core", () => {
	return {
		LogUtils: {
			info: vi.fn(),
			debug: vi.fn(),
		},
	};
});

vi.mock("node:fs", () => {
	class DirentMock {
		name: string;
		private _isDir: boolean;
		constructor(name: string, isDir: boolean) {
			this.name = name;
			this._isDir = isDir;
		}
		isDirectory() {
			return this._isDir;
		}
		isFile() {
			return !this._isDir;
		}
	}
	
	let fileContents: Record<string, string> = {};
	let dirEntries: Record<string, Array<{ name: string; isDir: boolean }>> = {};
	
	const promises = {
		readdir: async (dir: string, opts?: { withFileTypes?: boolean }) => {
			const entries = dirEntries[dir];
			if (!entries) throw new Error(`ENOENT: ${dir}`);
			if (opts?.withFileTypes) {
				return entries.map((e) => new DirentMock(e.name, e.isDir));
			}
			return entries.map((e) => e.name);
		},
		stat: async (p: string) => {
			const content = fileContents[p];
			if (content === undefined) throw new Error(`ENOENT: ${p}`);
			return { size: Buffer.byteLength(content, "utf8") };
		},
		readFile: async (p: string, enc?: string) => {
			const content = fileContents[p];
			if (content === undefined) throw new Error(`ENOENT: ${p}`);
			return content;
		},
	};
	
	return {
		Dirent: DirentMock,
		promises,
		__setMockFiles: (root: string, structure: { files: Record<string, string>; dirs: Record<string, Array<{ name: string; isDir: boolean }>> }) => {
			fileContents = {};
			dirEntries = {};
			const normalize = (p: string) => (path.isAbsolute(p) ? p : path.join(root, p));
			for (const [k, v] of Object.entries(structure.files)) {
				fileContents[normalize(k)] = v;
			}
			for (const [k, v] of Object.entries(structure.dirs)) {
				dirEntries[normalize(k)] = v.map((e) => ({ name: e.name, isDir: e.isDir }));
			}
			if (!dirEntries[root]) dirEntries[root] = [];
		},
	};
});

describe("translateToSourceScheme", () => {
	it("translates found @error JSDoc blocks and ignores blocks without @error", async () => {
		const { translateToSourceScheme } = await import("../../bin/extraction/translate-to-source-scheme.js");
		const scanResult = {
			rootDir: "root",
			scannedFiles: 1,
			skippedFiles: 0,
			blocks: [
				{
					filePath: "some/file.js",
					startLine: 1,
					raw: "/** @error E_ONE Beschreibung */",
					description: "Beschreibung",
					tags: [{ name: "error", raw: "E_ONE rest" }, { name: "param", raw: "x number" }],
				},
				{
					filePath: "other/file.js",
					startLine: 1,
					raw: "/** no error here */",
					description: "no error",
					tags: [{ name: "param", raw: "x number" }],
				},
			],
		} as any;
		
		const config = {
			sourceFile: {
				meta: {
					projectName: "P",
					description: "D",
					version: "0.0.1",
				},
			},
		} as any;
		
		const scheme = translateToSourceScheme(scanResult, config);
		expect(scheme.name).toBe("P");
		expect(scheme.description).toBe("D");
		expect(scheme.version).toBe("0.0.1");
		expect(scheme.errors).toHaveLength(1);
		const err = scheme.errors[0];
		expect(err.name).toBe("E_ONE");
		expect(err.description).toBe("Beschreibung");
		expect(err.tags.some((t: any) => t.name === "error")).toBeTruthy();
	});
});

describe("swerr-scan (scanJsdocs)", () => {
	beforeEach(() => {
		vi.resetModules();
	});
	
	it("scans virtual directory, reads JSDoc blocks and skips large files", async () => {
		const fsMock: any = await import("node:fs");
		const root = path.resolve("vfs-root");
		const file1Path = path.join(root, "file1.js");
		const file1Content = `/**
 * A test error description
 * @error E_TEST Something went wrong
 * @param x number
 */\nfunction f() {}`;
		const nojsdocContent = `// no jsdoc here\nconst x = 1;`;
		const largeContent = "0".repeat(10_000_000);
		const subErrorContent = `/**
 * Not an error block
 * @note just info
 */`;
		
		fsMock.__setMockFiles(root, {
			files: {
				"file1.js": file1Content,
				"nojsdoc.js": nojsdocContent,
				"large.bin": largeContent,
				[path.join("subdir", "errorless.js")]: subErrorContent,
			},
			dirs: {
				".": [
					{ name: "file1.js", isDir: false },
					{ name: "nojsdoc.js", isDir: false },
					{ name: "large.bin", isDir: false },
					{ name: "subdir", isDir: true },
				],
				"subdir": [{ name: "errorless.js", isDir: false }],
			},
		});
		
		const { scanJsdocs } = await import("../../bin/extraction/swerr-scan.js");
		
		const result = await scanJsdocs(root, {});
		
		expect(result.scannedFiles).toBe(3);
		expect(result.skippedFiles).toBe(1);
		
		const blocks = result.blocks;
		expect(blocks.length).toBe(2);
		const errorBlocks = blocks.filter((blk: any) => blk.tags.some((t: any) => t.name === "error"));
		expect(errorBlocks.length).toBe(1);
		
		const b = errorBlocks[0];
		expect(b.filePath).toBe(file1Path);
		expect(b.description).toContain("A test error description");
		expect(b.tags.some((t: any) => t.name === "error" && t.raw.includes("E_TEST"))).toBeTruthy();
	});
});
