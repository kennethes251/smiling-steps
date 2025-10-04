module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignore source map warnings for react-datepicker
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        { module: /node_modules\/react-datepicker\/dist/ },
      ];
      return webpackConfig;
    },
  },
};
