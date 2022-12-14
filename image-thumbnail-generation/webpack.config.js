const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    app: './src/app.ts',
    auth: './src/auth.ts',
    'upload-file': './src/upload-file.ts',
    'image-conversion': './src/image-conversion.ts',
    permission: './src/permission.ts'
  },
  target: 'node',
  externals: {
    'aws-sdk': 'aws-sdk'
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
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
    clean: true
  },
};