# Config

## Structure

```typescript
interface SwerrConfig {
	sourceFile: {
		inputDir?: string;
		meta?: {
			projectName?: string;
			version?: string;
			description?: string;
		};
		export?: {
			saveToFile?: boolean;
			fileName?: string;
			outputDir?: string;
		};
		options?: {
			ignoreDirs?: string[];
			whitelistExtensions?: string[];
		}
	},
	converter: ConverterConfig&lt;any&gt;[]
}

interface ConverterConfig&lt;CFG&gt; {
	factory: ConverterFn&lt;CFG&gt;;
	config: CFG;
}

type ConverterFn&lt;CFG&gt; = (config: CFG, scheme: SwerrScheme) =&gt; Promise&lt;void&gt;;
```

### sourceFile

The `sourceFile` object is important for defining certain information that the CLI uses to generate the source file consumed by the converter.

### inputDir

type: `string`**&#x20;required**

The root directory that the CLI scans for exception classes and JSDoc comments

### meta

Optional metadata that is attached to the generated source file. This information can be used by converters for documentation headers, versioning, or display purposes.

| Field         | Type     | Description            |
| ------------- | -------- | ---------------------- |
| `projectName` | `string` | Name of the project    |
| `version`     | `string` | Project or API version |
| `description` | `string` | Project description    |

### export

Controls whether the generated source file should be written to disk.

| Field        | Type      | Description                             |
| ------------ | --------- | --------------------------------------- |
| `saveToFile` | `boolean` | Enables writing the source file to disk |
| `fileName`   | `string`  | Name of the generated file              |
| `outputDir`  | `string`  | Output directory for the source file    |

If `saveToFile` is disabled, the source file is only kept in memory and passed directly to the converters.

### options

Additional options that influence how files are discovered and processed.

| Field                 | Type       | Description                                        |
| --------------------- | ---------- | -------------------------------------------------- |
| `ignoreDirs`          | `string[]` | Directories that should be ignored during scanning |
| `whitelistExtensions` | `string[]` | Allowed file extensions (e.g. `['.ts', '.js']`)    |

### converter

The `converter` property defines one or more converters that consume the generated source file.

Each converter consists of:

* a `factory` function that performs the conversion

* a `config` object that is passed to the converter

Multiple converters can be registered and will be executed sequentially

## Example Configuration

```javascript
import {myConverter} from "./src/docs/myConverter.ts"

export default {
  sourceFile: {
    inputDir: "src",
    meta: {
      projectName: "My API",
      description: "My API description",
      version: "1.0.0"
    },
    export: {
      saveToFile: true,
      fileName: "swerr-source.json",
      outputDir: "./dist/docs"
    },
    options: {
      ignoreDirs: ["node_modules", "dist"],
      whitelistExtensions: [".ts"]
    }
  },
  converter: [
    {
      factory: myConverter,
      config: {
        outputPath: "./dist/docs"
      }
    }
  ]
};
```
