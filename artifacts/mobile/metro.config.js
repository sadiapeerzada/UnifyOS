const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockedDirs = [
  path.join(workspaceRoot, ".local"),
  path.join(workspaceRoot, ".git"),
  path.join(workspaceRoot, ".cache"),
  path.join(workspaceRoot, "tmp"),
  path.join(workspaceRoot, ".pnpm-store"),
];

config.resolver.blockList = new RegExp(
  blockedDirs.map((d) => `^${escapeRe(d)}(\\/.*)?$`).join("|")
);

config.watcher = config.watcher || {};
config.watcher.healthCheck = { enabled: false };

module.exports = config;
