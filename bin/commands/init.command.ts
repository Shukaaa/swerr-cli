import path from "path";
import * as fs from "node:fs";
import {LogUtils} from "@swerr/core";
import {SWERR_CONFIG_FILE} from "../config.js";

const initConfigTemplate = `import {markdownConverter, htmlConverter} from "@swerr/converter"

// See more configuration options at https://swerr.apidocumentation.com/guide/introduction/config
export default {
    sourceFile: {
        inputDir: "./src", // Directory to scan for error definitions
        meta: {
            projectName: "Your Application Name",
            description: "The Application description",
            version: "1.0.0",
        },
        export: {
            saveToFile: false // Set to true to save the source scheme to a file, perfect for debugging
        },
        options: {
            ignoreDirs: [], // Directories to ignore during scanning (optional)
            whitelistExtensions: [".js", ".ts"] // File extensions to include during scanning (optional)
        }
    },
    converter: [ // Example converters
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

export const initCommand = async (options: { force?: boolean; config?: string }) => {
	const configFilePath = path.resolve(process.cwd(), options.config ?? SWERR_CONFIG_FILE);
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