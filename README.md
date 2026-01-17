# Swerr CLI

Swerr CLI is a command-line interface tool designed to easily create error documentation / catelogs for your projects. <br>
With the magic of JSDoc comments and Swerr, you can generate comprehensive error documentation in just a few simple steps.

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

Once you have your configuration file set up, you can run the swerr configuration with:

```bash
swerr run
```

This command will generate the error documentation based on your JSDoc comments and the settings in your `swerr.config.js` file.

## Documentation

https://swerr.apidocumentation.com