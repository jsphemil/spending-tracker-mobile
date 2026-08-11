const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Bundle drizzle-kit's generated .sql migration files as inline strings.
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./global.css" });
