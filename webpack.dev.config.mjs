import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

export default [
  {
    mode: 'development',
    entry: './dev/loader.ts',
    plugins: [
      new HtmlWebpackPlugin({ template: './dev/index.html'}),
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
          test: /\.(mjs|js)$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          }
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.dev.json'
            }
          },
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.ttl$/,
          use: 'raw-loader'
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
      port: 9001,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      }
    },
    devtool: 'source-map'
  }]
