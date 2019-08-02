const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.(mjs|js|ts)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        }
      }
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      // Prevent solid-auth-tls (used by solid-ui) from running Node code:
      'global.IS_BROWSER': JSON.stringify(true),
    }),
    new ForkTsCheckerWebpackPlugin(),
  ],
  node: {
    fs: 'empty'
  },
  devtool: 'source-map'
}
