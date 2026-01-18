import {SwerrCommand} from "./interfaces/swerr-command.js";
import path from "path";
import * as fs from "node:fs";
import {scanJsdocs} from "../extraction/swerr-scan.js";
import {translateToSourceScheme} from "../extraction/translate-to-source-scheme.js";
import {SWERR_CONFIG_FILE} from "../config.js";
import {existsSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {LogUtils, SwerrConfig, SwerrScheme} from "@swerr/core";

export const runCommand: SwerrCommand<[string, string]> = {
    command: "run [configPath]",
    description: "Create swerr documentation based on the config file.",
    action: async (configPath: string | undefined) => {
        const swerrConfig = await config(configPath);
        const sourceDir = swerrConfig?.sourceFile?.inputDir || null
        const outputDir = swerrConfig?.sourceFile?.export?.outputDir || null
        LogUtils.success("Swerr Configuration loaded.");

        if (!sourceDir || !outputDir) {
            LogUtils.error("Source and output directories must be specified either via configuration file.");
            process.exit(1);
        }

        const absoluteSourceDir = path.resolve(process.cwd(), sourceDir);
        const absoluteOutputDir = path.resolve(process.cwd(), outputDir);

        const sourceExists = fs.existsSync(absoluteSourceDir);
        if (!sourceExists) {
            LogUtils.error(`Source directory "${absoluteSourceDir}" does not exist.`);
            process.exit(1);
        }

        try {
            await fs.promises.mkdir(absoluteOutputDir, {recursive: true});
        } catch (err) {
            LogUtils.error(`Failed to create output directory "${absoluteOutputDir}": ${err}`);
            process.exit(1);
        }

        scanJsdocs(absoluteSourceDir, swerrConfig?.sourceFile.options || {}).then(async result => {
            LogUtils.info(`Scanned ${result.blocks.length} JSDocs block(s) from ${result.scannedFiles} file(s).`);
            const scheme = translateToSourceScheme(result, swerrConfig)
            LogUtils.info(`Translated scan result to swerr Scheme with ${scheme.errors.length} error(s).`);
            await saveSourceScheme(swerrConfig!, absoluteOutputDir, scheme);
            await runConverter(swerrConfig!, scheme);
        }).catch(err => {
            LogUtils.error(`Error during scanning: ${err}`);
        })
    }
}

async function config(configPath: string | undefined): Promise<SwerrConfig | null> {
    try {
        if (!configPath) {
            configPath = path.resolve(process.cwd(), SWERR_CONFIG_FILE);
        } else {
            configPath = path.resolve(process.cwd(), configPath);
        }
        let cfg: SwerrConfig | null = null;
        
        if (existsSync(configPath)) {
            LogUtils.info(`Loading configuration from ${configPath}`);
            try {
                const imported = await import(pathToFileURL(configPath).href);
                cfg = imported.default ?? imported;
                return cfg;
            } catch (err) {
                LogUtils.error(`Failed to load configuration from ${configPath}: ${err}`);
                process.exit(1);
            }
        }
        
        return null;
    } catch (err) {
        LogUtils.error(`Error loading configuration: ${err}`);
        process.exit(1);
    }
}

async function saveSourceScheme(config: SwerrConfig, absoluteOutputDir: string, scheme: SwerrScheme) {
    if (!config?.sourceFile?.export?.saveToFile) return
    const fileName = config?.sourceFile?.export?.fileName || "swerr-docs.json";
    const outputFilePath = path.join(absoluteOutputDir, fileName);
    const docContent = JSON.stringify(scheme, null, 2);
    try {
        await fs.promises.writeFile(outputFilePath, docContent, "utf8");
        LogUtils.success(`Swerr Source File written to ${outputFilePath}`);
    } catch (err) {
        console.error(`Failed to write documentation to "${outputFilePath}":`, err);
        process.exit(1);
    }
}

async function runConverter(config: SwerrConfig, scheme: SwerrScheme) {
    for (const converter of config.converter) {
        await converter.factory(converter.config, scheme);
    }
}