// Extends app.json. EXPO_BASE_URL hosts the web build under a sub-path,
// e.g. "/earlysignal-nvs" for GitHub Pages. Empty (the default) = site root,
// used for Vercel, local serving and the e2e tests.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '' },
});
