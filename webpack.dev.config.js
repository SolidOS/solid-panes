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
    externals: {
      rdflib: '$rdf',
      $rdf: '$rdf',
      'solid-logic': 'SolidLogic',
      SolidLogic: 'SolidLogic',
      'solid-ui': 'UI',
      UI: 'UI'
    },
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
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    devServer: {
      static: [
        './dev',
        {
          directory: './node_modules',
          publicPath: '/node_modules'
        }
      ],
      compress: true,
      port: 9000
    },
    devtool: 'source-map'
  }]
