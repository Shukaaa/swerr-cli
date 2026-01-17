# 0.1 MVP
- Add github action for versioning and releasing
- implement unit tests for converters
- Better cmd description and help texts
- Alternative config path via `--config` flag

# 0.2 Easy Setup
- `swerr init` interactive command to create a `swerr.config.js` based on user input
    - add `--yes` flag to skip prompts and create a default config file

# 0.3 Easy Configuration
- `swerr add converter <converter-name>` command to add converters to the configuration
- `swerr remove converter <converter-name>` command to remove converters from the configuration

# 1.0 Polish & CI-ready
- Config Overrides via CLI flags, for example:
    - `--set sourceFile.inputDir=src` to override input directory
    - `--set converter[0].config.fileName=errors.html` to override converter configurations
- `--dry-run` flag to simulate the generation process without creating files

# 2.0 Advanced Features
- `swerr watch` command to monitor source files for changes and automatically regenerate documentation
- `swerr doctor` command to check the configuration and environment for potential issues