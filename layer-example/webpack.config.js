const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    app: './src/app.ts',
    'vlb-layer/nodejs/node_modules/@vlb/msg': './src/vlb/msg.ts'
  },
  target: 'node',
  externals: {
    'aws-sdk': true,
    '@vlb/msg': true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: "./tsconfig.json"
      }),
    ],
  },
  output: {
    filename: '[name]/index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
    clean: true
  },
};