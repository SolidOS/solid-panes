import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'

export default [
  {
    mode: 'development',
    entry: './dev/loader.ts',
    output: {
      path: path.resolve(process.cwd(), 'dist-dev'),
      filename: 'solid-panes.js',
      library: {
        name: 'UI',
        type: 'umd'
      },
      globalObject: 'this',
      clean: true
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './dev/index.html' })
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.ts'],
      fallback: { path: false }
    },
    module: {
      rules: [
        {
          test: /\.(mjs|js|ts)$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
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
      '@trust/webcrypto': 'crypto',
      window: 'window'
    },
    devServer: {
      static: './dist',
      compress: true,
      port: 9000
    },
    devtool: 'source-map'
  }]
