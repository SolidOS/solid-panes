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
      extensions: ['.mjs', '.js', '.ts'],
      alias: {
        SolidUI: 'solid-ui',
        SolidLogic: 'solid-logic',
        $rdf: 'rdflib'
      }
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
    externals: {
      'solid-ui': 'UI',
      SolidUI: 'UI',
      'solid-logic': 'SolidLogic',
      SolidLogic: 'SolidLogic',
      rdflib: '$rdf'
    },
    devServer: {
      static: ['./dev',
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
