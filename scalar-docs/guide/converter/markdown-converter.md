# Markdown Converter

The Markdown Converter is one of the converters provided by the `@swerr/converter` package.

It converts the generated Swerr source file into a single Markdown (`.md`) document. The output is well-suited for READMEs, project documentation, Git repositories, or further processing by static site generators.

## Configuration

The Markdown Converter accepts a configuration object with the following structure:

```typescript
interface MarkdownConverterConfig {
  outputPath?: string;
  fileName?: string;
}
```

### outputPath

Type: `string`

The directory where the generated Markdown file will be written.

If not specified, the converter uses the current working directory.

### fileName

Type: `string`

The name of the generated Markdown file.

Defaults to `README.md` if not provided.

## Usage Example

Below is an example showing how to register the Markdown Converter in your `swerr.config.js` file:

First, import the converter:

```javascript
import {markdownConverter} from "@swerr/converter"
```

Then, register the converter in your configuration:

```javascript
converters: [
  {
    factory: markdownConverter,
    config: {
      outputPath: "docs",
      fileName: "errors.md"
    }
  }
]
```
