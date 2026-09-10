# HTML Converter

The HTML Converter is one of the converters provided by the `@swerr/converter` package.

It transforms the generated Swerr source file into a single, self-contained HTML file with no external dependencies. This makes it easy to distribute, host, or view the documentation without any additional setup.

## Configuration

The HTML Converter accepts a configuration object with the following structure:

```typescript
interface HtmlConverterConfig {
	outputPath?: string;
	fileName?: string;
}
```

### outputPath

Type: `string`

The directory where the generated HTML file will be written.

If not specified, the converter uses the current working directory.

### fileName

Type: `string`

The name of the generated HTML file.

Defaults to `index.html` if not provided.

## Usage Example

Below is an example showing how to register the HTML Converter in your `swerr.config.js` file:

First, import the converter:

```typescript
import {htmlConverter} from "@swerr/converter"
```

Then, register the converter in your configuration:

```javascript
converters: [
  {
    factory: htmlConverter,
    config: {
      outputPath: "docs",
      fileName: "errors.html"
    }
  }
]
```
