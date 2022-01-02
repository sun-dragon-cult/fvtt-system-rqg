// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    src: "/",
  },
  plugins: [
    [
      "@snowpack/plugin-sass",
      {
        loadPath: "./src/rqg.scss",
      },
    ],
  ],
  external: ["template.json"],
  optimize: {
    entrypoints: ["rqg.js", "template.js"],
    splitting: false,
    bundle: true,
    minify: true,
    target: "es2020",
  },
  packageOptions: {},
  devOptions: {
    out: "dist/",
    open: "none",
  },
  buildOptions: {
    out: "dist/",
  },
};
