#!/usr/bin/env node
import {Command} from "commander";
import {readFileSync} from "node:fs";
import path from "path";
import {fileURLToPath} from "node:url";
import {runCommand} from "./commands/run.command.js";
import {initCommand} from "./commands/init.command.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJsonRaw = readFileSync(packageJsonPath, 'utf-8');
const packageJson = JSON.parse(packageJsonRaw);

const cli = new Command();

cli
		.name("swerr")
		.description("Create documentation from your errors.")
		.version(packageJson.version);

cli
		.command("init")
		.description("Create a basic swerr config file.")
		.option("-f, --force", "Overwrite existing config file if it exists.")
		.option("-c, --config <path>", "Path to save the swerr config file.", "swerr.config.js")
		.action(initCommand);

cli
		.command("run [configPath]")
		.description("Create swerr documentation based on the config file.")
		.action(runCommand);

cli.parse();
