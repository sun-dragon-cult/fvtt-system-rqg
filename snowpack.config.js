// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    src: "/",
  },
  plugins: [
    ["@snowpack/plugin-typescript"], // TODO is run? but don't show the warnings/errors!
    [
      "@snowpack/plugin-sass",
      {
        loadPath: "./src/rqg.scss",
      },
    ],
  ],
  packageOptions: {},
  devOptions: {},
  buildOptions: {
    out: "dist/",
  },
};
