# 1.1.0
- Added `--config <path>` to `swerr init` for writing the configuration to a custom path.
- Added an optional positional config path to `swerr init`.
- Added `--force` to `swerr init` to overwrite an existing configuration file.
- Added configurable error block detection through `scan.errorBlockDetector`.
- Added support for scanning multiple source directories through `scan.directories`.
- Added Scalar documentation covering configuration, getting started, built-in converters, and custom converter development.
- `swerr init` now installs `@swerr/converter` automatically; use `--no-install` to skip installation.
- Added `--skip-config` to run the other `swerr init` steps without creating a configuration file.
- Fixed relative paths when running a configuration file from another directory.

# 1.0.0
- Initial release of the project.