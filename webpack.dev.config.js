import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

export default [
  {
    mode: 'development',
    entry: './dev/loader.ts',
    plugins: [
      new HtmlWebpackPlugin({ template: './dev/index.html' }),
      new NodePolyfillPlugin()
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.ts']
    },
    module: {
      rules: [
        {
          test: /\.(mjs|js|ts)$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader'
          }
        }
      ]
    },
    devServer: {
      static: './dist',
      compress: true,
      port: 9000
    },
    devtool: 'source-map'
  }]
