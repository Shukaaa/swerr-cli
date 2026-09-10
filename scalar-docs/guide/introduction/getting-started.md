# Getting Started

## What is Swerr?

Swerr is a CLI tool that generates structured error documentation directly from your source code.

It scans your project for exception classes and reads their JSDoc comments to build a normalized error schema. This schema is then passed to one or more converters, which transform it into different output formats such as HTML or Markdown.

## Installation

To install the Swerr CLI, use npm:

```bash
npm install -g @swerr/cli
```

First, you need a `swerr.config.js` file in your project root. You can create it manually or run:

```bash
swerr init
```

To learn more about the config file, see the following documentation:

<scalar-page-link title="Config" description="" path="/guide/introduction/config"></scalar-page-link>

### Generate Exception Docs

First, your exception classes need the `@error` tag in their JSDoc, for example:

```javascript
/**
 * My Exception class description.
 * @error
 */
```

This is required for the Swerr CLI to correctly detect exception classes.

Depending on the converter, additional JSDoc tags can be used to add important information to the generated documentation.

Once your configuration file and classes are set up, you can generate the Swerr source file with:

```bash
swerr run
```

This command generates error documentation based on your JSDoc comments and the settings in your `swerr.config.js` file.

> When using a converter from the `@swerr/converter` package, make sure to install the dependency
