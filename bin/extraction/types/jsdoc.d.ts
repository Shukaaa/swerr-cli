export type JsdocTag = {
    /** Tag name without "@" (e.g. "param", "throws", "error") */
    name: string;
    /** The full tag line content after "@name" (may include multiple lines if indented) */
    raw: string;
};

export type JsdocBlock = {
    filePath: string;
    /** 1-based line number where the block starts */
    startLine: number;
    /** The entire raw block including /** *\/ delimiters */
    raw: string;
    /** Free text before the first @tag */
    description: string;
    /** All tags in encounter order */
    tags: JsdocTag[];
};

/**
 * Context object passed to the error class detector function.
 * Provides all relevant information to determine if a js file represents an error class.
 */
export type ErrorClassDetectorContext = {
    /** The JSDoc tags found in the block */
    jsDocTags: JsdocTag[];
    /** The file name (basename) */
    fileName: string;
    /** The full file content */
    fileContent: string;
    /** The JSDoc block itself */
    block: JsdocBlock;
};
