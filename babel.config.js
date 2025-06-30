module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Make sure this plugin is the LAST item in the 'plugins' array
      "react-native-reanimated/plugin",
    ],
  };
};
