/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const SizePlugin = require("size-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin");

const dataPath = path.join(__dirname, "data");
const destPath = path.join(__dirname, "distribution");
const sourcePath = path.join(__dirname, "source");
const iconsPath = path.join(dataPath, "icons");
const stylesPath = path.join(dataPath, "styles");
const viewsPath = path.join(dataPath, "views");
const targetBrowser = process.env.TARGET_BROWSER;

module.exports = {
  devtool: false, // https://github.com/webpack/webpack/issues/1194#issuecomment-560382342
  stats: {
    all: false,
    builtAt: true,
    errors: true,
    hash: true,
  },
  entry: {
    manifest: path.join(dataPath, "manifest.json"),
    background: path.join(sourcePath, "Background", "index.ts"),
    contentScript: path.join(sourcePath, "ContentScript", "index.ts"),
    options: path.join(sourcePath, "Options", "index.tsx"),
  },
  output: {
    path: path.join(destPath, targetBrowser),
    filename: "[name].js",
  },
  resolve: {
    alias: {
      "webextension-polyfill-ts": path.resolve(
        path.join(__dirname, "node_modules", "webextension-polyfill-ts")
      ),
      Common: path.join(sourcePath, "Common"),
      Options: path.join(sourcePath, "Options"),
      Utils: path.join(sourcePath, "Utils"),
    },
    extensions: [".ts", ".tsx", ".js", ".json"],
    fallback: {
      assert: require.resolve("assert"),
      buffer: require.resolve("buffer"),
      child_process: false, // require.resolve("child_process"),
      crypto: require.resolve("crypto-browserify"),
      fs: false, // require.resolve("fs"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      net: false, // require.resolve("net"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      querystring: require.resolve("querystring-es3"),
      stream: require.resolve("stream-browserify"),
      tls: false, // require.resolve("tls"),
      url: require.resolve("url"),
      util: require.resolve("util"),
      "webext-options-sync": require.resolve("webext-options-sync"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
  module: {
    rules: [
      {
        type: "javascript/auto", // prevent Webpack from handling json with its own loaders
        test: /manifest\.json$/,
        use: {
          loader: "wext-manifest-loader",
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // create a CSS file per JS file which contains CSS
          },
          {
            loader: "css-loader", // take the CSS files and return the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader", // for autoprefixer
            options: {
              postcssOptions: {
                ident: "postcss",
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                plugins: [require("autoprefixer")()],
              },
            },
          },
          "resolve-url-loader", // rewrite relative paths in url() statements
          "sass-loader", // compile Sass/SCSS files to CSS
        ],
      },
    ],
  },
  plugins: [
    new WextManifestWebpackPlugin(),
    new webpack.SourceMapDevToolPlugin({ filename: false }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: iconsPath,
        },
        {
          from: stylesPath,
        },
        {
          from: viewsPath,
        },
        {
          from: "node_modules/webextension-polyfill/dist/browser-polyfill.min.js",
        },
      ],
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false,
          compress: false,
          output: {
            beautify: true,
            indent_level: 2, // eslint-disable-line camelcase
          },
        },
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorPluginOptions: {
          preset: ["default", { discardComments: { removeAll: true } }],
        },
      }),
    ],
  },
};
