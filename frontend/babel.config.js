module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Strip console.* (except errors) from production bundles only. Dev/preview
  // (Metro dev server) keeps logs for debugging.
  const isProd =
    process.env.BABEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProd) {
    plugins.push(["transform-remove-console", { exclude: ["error"] }]);
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
