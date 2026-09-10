import path from "path";
import * as fs from "node:fs";
import {spawn} from "node:child_process";
import {LogUtils} from "@swerr/core";
import {SWERR_CONFIG_FILE} from "../config.js";

const initConfigTemplate = `import {markdownConverter, htmlConverter} from "@swerr/converter"

// See more configuration options at https://swerr.apidocumentation.com/guide/introduction/config
export default {
    schemaVersion: 1,
    project: {
        name: "Your Application Name",
        description: "The Application description",
        version: "1.0.0",
    },
    scan: {
        directories: ["./src"], // Directories to scan for error definitions
        ignoredDirectories: [], // Directories to ignore during scanning (optional)
        includeExtensions: [".js", ".ts"], // File extensions to include during scanning (optional)
        requireErrorTag: false,
        // Optional: Custom function to determine whether a JSDoc block is an error
        // errorBlockDetector: (ctx) => {
        //     return ctx.fileName.endsWith("Exception.js");
        // }
    },
    sourceOutput: {
        enabled: false, // Set to true to save the generated source scheme to a file
        directory: "./docs",
        fileName: "swerr-source.json",
    },
    converters: [ // Example converters
        {
            factory: markdownConverter,
            config: {
                outputPath: "./docs",
            }
        },
        {
            factory: htmlConverter,
            config: {
                outputPath: "./docs",
            }
        }
    ]
}`;

type InitOptions = {
	force?: boolean;
	config?: string;
	install?: boolean;
	noInstall?: boolean;
	skipConfig?: boolean;
};

function installConverter(): Promise<void> {
	const isWindows = process.platform === "win32";
	const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
	const npmArgs = isWindows
		? ["/d", "/s", "/c", "npm.cmd install @swerr/converter"]
		: ["install", "@swerr/converter"];

	return new Promise((resolve, reject) => {
		const child = spawn(npmCommand, npmArgs, {
			cwd: process.cwd(),
			stdio: "inherit",
		});

		child.once("error", reject);
		child.once("close", code => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`npm install exited with code ${code ?? "unknown"}.`));
		});
	});
}

export const initCommand = async (configPath: string | undefined, options: InitOptions) => {
	const shouldInstall = options.noInstall !== true && options.install !== false;
	if (shouldInstall) {
		try {
			LogUtils.info("Installing @swerr/converter...");
			await installConverter();
		} catch (err) {
			LogUtils.error(`Failed to install @swerr/converter: ${err}`);
			process.exit(1);
		}
	}

	if (options.skipConfig) {
		LogUtils.success("Initialization completed without creating a config file.");
		return;
	}

	const configFilePath = path.resolve(
		process.cwd(),
		options.config ?? configPath ?? SWERR_CONFIG_FILE,
	);
	const targetName = path.basename(configFilePath);

	const existedBefore = fs.existsSync(configFilePath);
	if (existedBefore && !options.force) {
		try {
			const stat = fs.lstatSync(configFilePath);
			if (stat.isDirectory()) {
				LogUtils.error(`A directory named ${targetName} already exists in the current directory.`);
			} else {
				LogUtils.error(`A ${targetName} file already exists in the current directory.`);
			}
		} catch {
			LogUtils.error(`A ${targetName} entry already exists in the current directory.`);
		}
		process.exit(1);
	}

	try {
		await fs.promises.mkdir(path.dirname(configFilePath), { recursive: true });
		await fs.promises.writeFile(configFilePath, initConfigTemplate, { encoding: "utf8" });
		if (existedBefore && options.force) {
			LogUtils.success(`${targetName} file has been overwritten successfully.`);
		} else {
			LogUtils.success(`${targetName} file has been created successfully.`);
		}
	} catch (err) {
		LogUtils.error(`Failed to create ${targetName} file: ${err}`);
		process.exit(1);
	}
}