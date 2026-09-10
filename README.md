# Swerr CLI

Swerr CLI generates structured error documentation from JSDoc comments in your source code.

## Installation

To install Swerr CLI, use npm:

```bash
npm install -g @swerr/cli
```

## Usage

First of all, you need a `swerr.config.js` file in your project root. You can create one manually or run:

```bash
swerr init
```

`swerr init` installs `@swerr/converter` automatically because the generated configuration imports the built-in converters. Use `swerr init --no-install` to skip installation. Use `swerr init --skip-config` when only the other initialization steps are needed. The `--config <path>` and `--force` options can be combined with these flags.

An optional config path can also be passed directly:

```bash
swerr init ./example/swerr.config.js
```

If both forms are provided, `--config <path>` takes precedence.

Once you have your configuration file set up, you can run the swerr configuration with:

```bash
swerr run
```

This command will generate the error documentation based on your JSDoc comments and the settings in your `swerr.config.js` file.

## Documentation

https://swerr.apidocumentation.com