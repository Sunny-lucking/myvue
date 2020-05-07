// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    entry:'./src/index.js',// 以src下的index.js 作为入口文件进行打包
    output:{
        filename:'bundle.js',
        path:path.resolve(__dirname,'dist')
    },
    devtool:'source-map', // 调试的时候可以快速找到错误代码
    resolve:{
        // 更改模块查找方方式（默认的是去node_modules里去找）去source文件里去找
        modules:[path.resolve(__dirname,'source'),path.resolve('node_modules')]
    },
    plugins:[
        new HtmlWebpackPlugin({
            template:path.resolve(__dirname,'public/index.html')
        })
    ]
}
