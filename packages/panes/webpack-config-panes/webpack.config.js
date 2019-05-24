const webpack = require('webpack')
const path = require('path')

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

function getWebpackConfig (panePath) {
  return {
    entry: './src/index',
    resolve: {
      extensions: ['.mjs', '.js', '.ts']
    },
    module: {
      rules: [
        {
          include: [path.resolve(panePath, 'src')],
          loader: 'babel-loader',

          options: {
            plugins: ['syntax-dynamic-import'],

            presets: [
              [
                '@babel/preset-env',
                {
                  modules: false
                }
              ],
              '@babel/preset-typescript'
            ]
          },

          test: /\.(mjs|js|ts)$/
        }
      ]
    },

    output: {
      chunkFilename: '[name].[chunkhash].js',
      filename: 'main.js',
      libraryTarget: 'umd'
    },

    mode: 'development',

    plugins: [
      new webpack.DefinePlugin({
        // Prevent solid-auth-tls (used by solid-ui) from running Node code:
        'global.IS_BROWSER': JSON.stringify(true)
      }),
      new ForkTsCheckerWebpackPlugin()
    ],

    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            priority: -10,
            test: /[\\/]node_modules[\\/]/
          }
        },

        chunks: 'async',
        minChunks: 1,
        minSize: 30000,
        name: true
      }
    }
  }
}

module.exports = getWebpackConfig
