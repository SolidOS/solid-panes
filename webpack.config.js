const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = (env, args) => ({
  entry: './index.js',
  output: {
    filename: (args.mode === 'production') ? 'main.min.js' : 'main.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts']
  },
  module: {
    rules: [
      {
        test: /\.(mjs|js|ts)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.ttl$/i,
        use: {
          loader: 'raw-loader'
        }
      }
    ]
  },
  externals: {
    rdflib: 'rdflib',
    'solid-namespace': 'solid-namespace',
    'solid-ui': 'solid-ui'
  },
  plugins: [
    new webpack.DefinePlugin({
      // Prevent solid-auth-tls (used by solid-ui) from running Node code:
      'global.IS_BROWSER': JSON.stringify(true)
    }),
    new ForkTsCheckerWebpackPlugin()
  ],
  node: {
    fs: 'empty'
  },
  devtool: 'source-map'
})
