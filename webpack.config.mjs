import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'

const common = {
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    fallback: {
      path: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttl$/i,
        type: 'asset/source'
      }
    ],
  },
  externals: {
    'fs': 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    'text-encoding': 'TextEncoder',
    '@trust/webcrypto': 'crypto',
    'rdflib': 'rdflib',
    '$rdf': 'rdflib',
    'solid-logic': 'SolidLogic',
    'SolidLogic': 'SolidLogic',
    'solid-ui': 'UI',
    'UI': 'UI',
  },
  devtool: 'source-map',
}

const normalConfig = {
  ...common,
  mode: 'production',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'solid-panes.js',
    library: {
      type: 'umd',
      name: 'SolidPanes',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  plugins: [
    ...(common.plugins || []),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/**/*.css',
          to: ({ context, absoluteFilename }) => {
            // Preserve folder structure under dist/
            const relPath = path.relative(path.resolve('src'), absoluteFilename);
            return path.resolve('dist', relPath);
          },
        },
      ],
    }),
  ],
  optimization: {
    minimize: false,
  }
}

const minConfig = {
  ...common,
  mode: 'production',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'solid-panes.min.js',
    library: {
      type: 'umd',
      name: 'SolidPanes',
      export: 'default',
    },
    globalObject: 'this',
    clean: false,
  },
  plugins: [
    ...(common.plugins || []),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/**/*.css',
          to: ({ context, absoluteFilename }) => {
            // Preserve folder structure under dist/
            const relPath = path.relative(path.resolve('src'), absoluteFilename);
            return path.resolve('dist', relPath);
            },
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ],
  }
}

export default [normalConfig, minConfig]