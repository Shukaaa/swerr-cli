import path from "path";
import * as fs from "node:fs";
import {randomUUID} from "node:crypto";
import {scanJsdocs} from "../extraction/swerr-scan.js";
import {translateToSourceScheme} from "../extraction/translate-to-source-scheme.js";
import {SWERR_CONFIG_FILE} from "../config.js";
import {existsSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {LogUtils, SwerrScheme} from "@swerr/core";
import {normalizeSwerrConfig, SwerrConfig, validateSwerrConfig} from "../config-schema.js";
import type {ScanResult} from "../extraction/types/scan.js";

export const runCommand = async (configPath: string | undefined) => {
	const loadedConfig = await config(configPath);
	
	if (!loadedConfig) {
		LogUtils.error(`Swerr configuration file not found. Please create a ${SWERR_CONFIG_FILE} file in the current directory or specify a custom path using --config option.`);
		process.exit(1);
	}

	const {config: swerrConfig, directory: configDirectory} = loadedConfig;
	
	LogUtils.success("Swerr Configuration loaded.");
	
	const absoluteSourceDirs = swerrConfig.scan.directories.map(sourceDir =>
		path.resolve(configDirectory, sourceDir),
	);
	const absoluteOutputDir = path.resolve(configDirectory, swerrConfig.sourceOutput.directory);
	
	for (const absoluteSourceDir of absoluteSourceDirs) {
		if (!fs.existsSync(absoluteSourceDir)) {
			LogUtils.error(`Source directory "${absoluteSourceDir}" does not exist.`);
			process.exit(1);
		}
	}
	
	if (swerrConfig.sourceOutput.enabled) {
		try {
			await fs.promises.mkdir(absoluteOutputDir, {recursive: true});
		} catch (err) {
			LogUtils.error(`Failed to create output directory "${absoluteOutputDir}": ${err}`);
			process.exit(1);
		}
	}
	
	try {
		const mergedResult: ScanResult = {
			rootDir: absoluteSourceDirs[0],
			blocks: [],
			scannedFiles: 0,
			skippedFiles: 0,
		};
		
		for (const absoluteSourceDir of absoluteSourceDirs) {
			const result = await scanJsdocs(absoluteSourceDir, swerrConfig.scan);
			mergedResult.blocks.push(...result.blocks);
			mergedResult.scannedFiles += result.scannedFiles;
			mergedResult.skippedFiles += result.skippedFiles;
		}
		
		LogUtils.info(`Scanned ${mergedResult.blocks.length} JSDocs block(s) from ${mergedResult.scannedFiles} file(s).`);
		const scheme = translateToSourceScheme(mergedResult, swerrConfig)
		LogUtils.info(`Translated scan result to swerr Scheme with ${scheme.errors.length} error(s).`);
		await saveSourceScheme(swerrConfig, absoluteOutputDir, scheme);
		await runConverter(swerrConfig, scheme, configDirectory);
	} catch (err) {
		LogUtils.error(`Error during scanning: ${err}`);
		process.exit(1);
	}
}

type LoadedConfig = {
	config: SwerrConfig;
	directory: string;
};

async function config(configPath: string | undefined): Promise<LoadedConfig | null> {
	try {
		let configFilePath = path.resolve(process.cwd(), configPath ?? SWERR_CONFIG_FILE);
		if (configPath && existsSync(configFilePath) && fs.statSync(configFilePath).isDirectory()) {
			configFilePath = path.join(configFilePath, SWERR_CONFIG_FILE);
		}

		if (existsSync(configFilePath)) {
			LogUtils.info(`Loading configuration from ${configFilePath}`);
			try {
				const imported = await loadConfigModule(configFilePath);
				const normalizedConfig = normalizeSwerrConfig(imported.default ?? imported);
				validateSwerrConfig(normalizedConfig);
				return {
					config: normalizedConfig,
					directory: path.dirname(configFilePath),
				};
			} catch (err) {
				LogUtils.error(`Failed to load configuration from ${configFilePath}: ${err}`);
				process.exit(1);
			}
		}

		return null;
	} catch (err) {
		LogUtils.error(`Error loading configuration: ${err}`);
		process.exit(1);
	}
}

async function loadConfigModule(configFilePath: string) {
	const source = await fs.promises.readFile(configFilePath, "utf8");
	const isJavaScriptEsm = path.extname(configFilePath) === ".js"
		&& /^\s*(?:import|export)\b/m.test(source);

	if (!isJavaScriptEsm) {
		return import(pathToFileURL(configFilePath).href);
	}

	const temporaryConfigPath = path.join(
		path.dirname(configFilePath),
		`.swerr-config-${randomUUID()}.mjs`,
	);

	try {
		await fs.promises.writeFile(temporaryConfigPath, source, "utf8");
		return await import(pathToFileURL(temporaryConfigPath).href);
	} finally {
		await fs.promises.unlink(temporaryConfigPath);
	}
}

async function saveSourceScheme(config: SwerrConfig, absoluteOutputDir: string, scheme: SwerrScheme) {
	if (!config.sourceOutput.enabled) return;
	const fileName = config.sourceOutput.fileName;
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

async function runConverter(config: SwerrConfig, scheme: SwerrScheme, configDirectory: string) {
	for (const converter of config.converters) {
		await converter.factory(resolveConverterConfig(converter.config, configDirectory), scheme);
	}
}

function resolveConverterConfig(config: unknown, configDirectory: string): unknown {
	if (typeof config !== "object" || config === null || Array.isArray(config)) {
		return config;
	}

	if (
		"outputPath" in config
		&& typeof config.outputPath === "string"
		&& !path.isAbsolute(config.outputPath)
	) {
		return {
			...config,
			outputPath: path.resolve(configDirectory, config.outputPath),
		};
	}

	return config;
}