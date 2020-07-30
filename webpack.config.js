const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = [{
  mode: 'development',
  entry: './dev/loader.ts',
  output: {
    path: path.resolve(__dirname, 'dev/dist'),
    filename: 'loader.bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './dev/index.html' })
  ],
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
      }
    ]
  },
  externals: {
    fs: 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    xmldom: 'window',
    'text-encoding': 'TextEncoder',
    'whatwg-url': 'window',
    '@trust/webcrypto': 'crypto'
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },
  devtool: 'source-map'
}]
