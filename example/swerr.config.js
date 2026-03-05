import {markdownConverter, htmlConverter} from "@swerr/converter"

export default {
    sourceFile: {
        inputDir: "./src/exceptions",
        meta: {
            projectName: "Muffin API",
            description: "The API description",
            version: "1.0.5",
        },
        export: {
            saveToFile: true,
            fileName: "swerr-source.json",
            outputDir: "./docs",
        },
        options: {
            ignoreDirs: [],
            whitelistExtensions: [
                ".js"
            ],
            errorClassDetector: (ctx) => {
                 return ctx.fileName.endsWith("Exception.js");
            }
        }
    },
    converter: [
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