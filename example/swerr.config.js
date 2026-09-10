import {markdownConverter, htmlConverter} from "@swerr/converter"

export default {
    schemaVersion: 1,
    project: {
        name: "Muffin API",
        description: "The API description",
        version: "1.0.5",
    },
    scan: {
        directories: ["./src/exceptions"],
        ignoredDirectories: [],
        includeExtensions: [".js"],
        requireErrorTag: false,
        errorBlockDetector: (ctx) => {
            return ctx.fileName.endsWith("Exception.js");
        }
    },
    sourceOutput: {
        enabled: true,
        fileName: "swerr-source.json",
        directory: "./docs",
    },
    converters: [
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
}