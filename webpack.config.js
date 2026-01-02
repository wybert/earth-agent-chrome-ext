const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    sidepanel: './src/sidepanel/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // Extract CSS to separate file (CSP-safe for Manifest V3)
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'tailwindcss',
                  'autoprefixer',
                ],
              },
            },
          },
        ],
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css', // Output CSS files (sidepanel.css, etc.)
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
        {
          from: 'src/sidepanel/index.html',
          to: 'sidepanel.html',
          transform(content, absoluteFrom) {
            // Inject the CSS link and script tag for sidepanel
            return content.toString()
              .replace(
                '</head>',
                '  <link rel="stylesheet" href="sidepanel.css">\n</head>'
              )
              .replace(
                '<script src="index.tsx"></script>',
                '<script src="sidepanel.js"></script>'
              );
          }
        }
      ]
    })
  ]
}; 