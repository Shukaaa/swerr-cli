# Getting Started

## What is Swerr?

Swerr is a CLI tool that generates structured error documentation from JSDoc comments in your source code.

It scans one or more configured directories, builds a normalized `SwerrScheme`, and passes that scheme to the registered converters.

## Installation

Install the CLI globally or as a project dependency:

```bash
npm install -g @swerr/cli
```

When the converter package is not installed automatically, install it manually:

```bash
npm install @swerr/converter
```

## Create a configuration

Create a `swerr.config.js` file manually or run:

```bash
swerr init
```

The init command installs `@swerr/converter` automatically because the generated configuration imports the built-in HTML and Markdown converters. Skip this step with:

```bash
swerr init --no-install
```

Use `--skip-config` when you want to run the other initialization steps without creating a configuration file:

```bash
swerr init --skip-config
```

Use `--config <path>` to write the configuration to another path or `--force` to overwrite an existing file.

The path can also be passed as an optional argument:

```bash
swerr init ./example/swerr.config.js
```

When both a positional path and `--config <path>` are provided, the option takes precedence.

The generated configuration uses the current schema. The main sections are:

<scalar-page-link title="Config" description="" path="/guide/introduction/config"></scalar-page-link>

## Document errors

By default, every JSDoc block in the configured directories can be included. Add `@error` tags and set `scan.requireErrorTag` to `true` when only explicitly marked blocks should be documented:

```javascript
/**
 * My exception class description.
 * @error
 */
export class MyException extends Error {}
```

Alternatively, use `scan.errorBlockDetector` to select blocks based on the file name, source content, or parsed JSDoc data.

## Generate documentation

Once the configuration and source files are ready, run:

```bash
swerr run
```

Swerr scans all configured directories, creates one combined scheme, writes the optional source JSON file, and runs the configured converters.
