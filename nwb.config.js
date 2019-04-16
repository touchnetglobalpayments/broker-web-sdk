module.exports = {
  type: "react-component",
  npm: {
    esModules: false,
    umd: {
      global: "BrokerWebSdk",
      externals: {
        react: "React"
      }
    }
  },
  webpack: {
    html: {
      template: "demo/src/index.html"
    },
    extra: {
      watch: true
    }
  }
};
