import type {SwerrScheme} from "@swerr/core";
import {DEFAULT_MAX_FILE_SIZE} from "./config.js";
import type {ErrorBlockDetectorContext} from "./extraction/types/jsdoc.js";

export const CURRENT_CONFIG_SCHEMA_VERSION = 1 as const;

export type ErrorBlockDetector = (context: ErrorBlockDetectorContext) => boolean;

export type SwerrProjectConfig = {
    name: string;
    version: string;
    description: string;
};

export type SwerrScanConfig = {
    directories: string[];
    ignoredDirectories: string[];
    includeExtensions: string[];
    requireErrorTag: boolean;
    maxFileSizeBytes: number;
    errorBlockDetector?: ErrorBlockDetector;
};

export type SwerrSourceOutputConfig = {
    enabled: boolean;
    directory: string;
    fileName: string;
};

export type SwerrConverterConfig = {
    factory: (config: unknown, scheme: SwerrScheme) => void | Promise<void>;
    config: unknown;
};

export type SwerrConfig = {
    schemaVersion: typeof CURRENT_CONFIG_SCHEMA_VERSION;
    project: SwerrProjectConfig;
    scan: SwerrScanConfig;
    sourceOutput: SwerrSourceOutputConfig;
    converters: SwerrConverterConfig[];
};

type ConfigRecord = Record<string, unknown>;

const hasOwn = (record: ConfigRecord, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, key);

function asRecord(value: unknown, fieldName: string): ConfigRecord | undefined {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Configuration field "${fieldName}" must be an object.`);
    }
    return value as ConfigRecord;
}

function firstDefined(records: Array<ConfigRecord | undefined>, keys: string[]): unknown {
    for (const record of records) {
        if (!record) continue;
        for (const key of keys) {
            if (hasOwn(record, key)) return record[key];
        }
    }
    return undefined;
}

function readString(value: unknown, fieldName: string, fallback: string): string {
    if (value === undefined) return fallback;
    if (typeof value !== "string") {
        throw new Error(`Configuration field "${fieldName}" must be a string.`);
    }
    return value.trim();
}

function readStringArray(value: unknown, fieldName: string, fallback: string[]): string[] {
    if (value === undefined) return [...fallback];
    if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
        throw new Error(`Configuration field "${fieldName}" must be an array of non-empty strings.`);
    }
    return value.map(item => item.trim());
}

function readDirectoryArray(value: unknown, fieldName: string): string[] {
    if (value === undefined) return [];
    if (typeof value === "string") {
        return value.trim() ? [value.trim()] : [];
    }
    return readStringArray(value, fieldName, []);
}

function readExtensions(value: unknown, fieldName: string): string[] {
    return readStringArray(value, fieldName, []).map(extension => {
        const normalized = extension.toLowerCase();
        return normalized.startsWith(".") ? normalized : `.${normalized}`;
    });
}

function readBoolean(value: unknown, fieldName: string, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    if (typeof value !== "boolean") {
        throw new Error(`Configuration field "${fieldName}" must be a boolean.`);
    }
    return value;
}

function readPositiveInteger(value: unknown, fieldName: string, fallback: number): number {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`Configuration field "${fieldName}" must be a positive safe integer.`);
    }
    return value;
}

function readSchemaVersion(value: unknown): typeof CURRENT_CONFIG_SCHEMA_VERSION {
    if (value === undefined) return CURRENT_CONFIG_SCHEMA_VERSION;
    if (value !== CURRENT_CONFIG_SCHEMA_VERSION) {
        throw new Error(
            `Unsupported configuration schemaVersion "${String(value)}". Expected ${CURRENT_CONFIG_SCHEMA_VERSION}.`,
        );
    }
    return CURRENT_CONFIG_SCHEMA_VERSION;
}

export function normalizeSwerrConfig(rawConfig: unknown): SwerrConfig {
    const raw = asRecord(rawConfig, "root");
    if (!raw) {
        throw new Error("The Swerr configuration must export an object.");
    }

    const legacySourceFile = asRecord(raw.sourceFile, "sourceFile");
    const legacyMeta = asRecord(legacySourceFile?.meta, "sourceFile.meta");
    const legacyExport = asRecord(legacySourceFile?.export, "sourceFile.export");
    const legacyOptions = asRecord(legacySourceFile?.options, "sourceFile.options");
    const project = asRecord(raw.project, "project");
    const scan = asRecord(raw.scan, "scan");
    const sourceOutput = asRecord(raw.sourceOutput, "sourceOutput");

    const directories = readDirectoryArray(
        firstDefined([scan, legacySourceFile], ["directories", "inputDirectories", "inputDirs", "inputDir"]),
        "scan.directories",
    );

    const convertersValue = firstDefined([raw], ["converters", "converter"]);
    if (convertersValue !== undefined && !Array.isArray(convertersValue)) {
        throw new Error('Configuration field "converters" must be an array.');
    }

    const converters = (convertersValue ?? []).map((converter, index) => {
        const entry = asRecord(converter, `converters[${index}]`);
        if (!entry || typeof entry.factory !== "function") {
            throw new Error(`Configuration field "converters[${index}].factory" must be a function.`);
        }
        return {
            factory: entry.factory as SwerrConverterConfig["factory"],
            config: entry.config,
        };
    });

    const detector = firstDefined(
        [scan, legacyOptions],
        ["errorBlockDetector", "errorClassDetector"],
    );
    if (detector !== undefined && typeof detector !== "function") {
        throw new Error('Configuration field "scan.errorBlockDetector" must be a function.');
    }

    return {
        schemaVersion: readSchemaVersion(raw.schemaVersion),
        project: {
            name: readString(
                firstDefined([project, legacyMeta], ["name", "projectName"]),
                "project.name",
                "",
            ),
            version: readString(
                firstDefined([project, legacyMeta], ["version"]),
                "project.version",
                "1.0.0",
            ),
            description: readString(
                firstDefined([project, legacyMeta], ["description"]),
                "project.description",
                "Generated by Swerr",
            ),
        },
        scan: {
            directories,
            ignoredDirectories: readStringArray(
                firstDefined([scan, legacyOptions], ["ignoredDirectories", "ignoreDirs"]),
                "scan.ignoredDirectories",
                [],
            ),
            includeExtensions: readExtensions(
                firstDefined([scan, legacyOptions], ["includeExtensions", "whitelistExtensions"]),
                "scan.includeExtensions",
            ),
            requireErrorTag: readBoolean(
                firstDefined([scan, legacyOptions, legacySourceFile], ["requireErrorTag"]),
                "scan.requireErrorTag",
                false,
            ),
            maxFileSizeBytes: readPositiveInteger(
                firstDefined([scan, legacyOptions], ["maxFileSizeBytes"]),
                "scan.maxFileSizeBytes",
                DEFAULT_MAX_FILE_SIZE,
            ),
            ...(detector === undefined
                ? {}
                : {errorBlockDetector: detector as ErrorBlockDetector}),
        },
        sourceOutput: {
            enabled: readBoolean(
                firstDefined([sourceOutput, legacyExport], ["enabled", "saveToFile"]),
                "sourceOutput.enabled",
                false,
            ),
            directory: readString(
                firstDefined([sourceOutput, legacyExport], ["directory", "outputDirectory", "outputDir"]),
                "sourceOutput.directory",
                "./docs",
            ),
            fileName: readString(
                firstDefined([sourceOutput, legacyExport], ["fileName"]),
                "sourceOutput.fileName",
                "swerr-source.json",
            ),
        },
        converters,
    };
}

export function validateSwerrConfig(config: SwerrConfig): void {
    if (config.scan.directories.length === 0) {
        throw new Error('Configuration field "scan.directories" must contain at least one directory.');
    }

    if (config.sourceOutput.enabled) {
        if (!config.sourceOutput.directory) {
            throw new Error('Configuration field "sourceOutput.directory" is required when sourceOutput.enabled is true.');
        }
        if (!config.sourceOutput.fileName) {
            throw new Error('Configuration field "sourceOutput.fileName" is required when sourceOutput.enabled is true.');
        }
    }
}
