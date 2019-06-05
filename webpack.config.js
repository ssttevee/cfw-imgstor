const webpack = require('webpack');

module.exports = function(env, argv) {
    return {
        target: 'webworker',
        mode: argv.p ? 'production' : 'development',
        entry: [
            require.resolve('./src/main.ts'),
        ],
        devtool: 'sourcemap',
        resolve: {
            modules: [
                'node_modules',
                'local_modules',
            ],
            extensions: [
                '.js',
                '.ts',
                '.json',
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                'B2_ID': JSON.stringify(process.env.B2_ID),
                'B2_KEY': JSON.stringify(process.env.B2_KEY),
                'B2_BUCKET': JSON.stringify(process.env.B2_BUCKET),
            }),
        ],
        module: {
            rules: [
                {
                    test: [/\.ts$/],
                    use: [
                        'awesome-typescript-loader',
                    ],
                },
            ],
        },
    };
};