import path from 'path';

import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';

import schema from './options.json';

/**
 * file-loader
 * @param {Buffer} content 此处的 content 传进来的是文件的 Buffer 对象
 */
export default function loader(content) {
  // this 的类型是 LoaderContext，相关 API 可以在 https://webpack.docschina.org/api/loaders/#loader-上下文 找到
  // loader-utils 工具库的 API 可以在 https://github.com/webpack/loader-utils 找到
  //    - getOptions 是用来获取 loader 的 options 的方法
  const options = loaderUtils.getOptions(this) || {};

  // 验证 options 是否正确
  // schema-utils 工具库的 API 可以在 https://github.com/webpack/schema-utils 找到
  // 第三个参数是用来配置校验失败是打印出来的错误日志中相关的内容，详细可见 https://github.com/vabaly/schema-utils
  validateOptions(schema, options, {
    name: 'File Loader',
    baseDataPath: 'options',
  });

  // 获取 options 中的 context 属性，没配置的话则使用 this.rootContext
  // 【Todo - 查看 webpack 源码】目前的理解是，this.rootContext 本身是 options 中的 context 属性，
  // 没获取到的话则是模块所在的目录，即 this.context 的值
  const context = options.context || this.rootContext;

  // 获得一个名字
  const url = loaderUtils.interpolateName(
    this,
    options.name || '[contenthash].[ext]',
    {
      context,
      content,
      regExp: options.regExp,
    }
  );

  // outputPath 默认是文件名，例如 9c87cbf3ba33126ffd25ae7f2f6bbafb.png
  let outputPath = url;

  // loader 的 options 里面可以配置 outputPath
  // 类型可以是函数也可以是字符串，函数的话，需要返回一个路径字符串，作为最终的 outputPath
  if (options.outputPath) {
    if (typeof options.outputPath === 'function') {
      outputPath = options.outputPath(url, this.resourcePath, context);
    } else {
      outputPath = path.posix.join(options.outputPath, url);
    }
  }

  // 为什么这里要用 JSON.stringify 去操作一个字符串
  // 【Answer】JSON.stringify 操作一个字符串的时候，会将双引号也放入到返回的值中，例如 'foo' => '"foo"'
  // 这样一来，publicPath 就会是 '__webpack_public_path__ + "9c87cbf3ba33126ffd25ae7f2f6bbafb.png"' 这样的字符串
  // 这个字符串作为代码写入到文件中，则 __webpack_public_path__ 就成了变量，"9c87cbf3ba33126ffd25ae7f2f6bbafb.png" 就是个字符串了
  let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;

  if (options.publicPath) {
    if (typeof options.publicPath === 'function') {
      publicPath = options.publicPath(url, this.resourcePath, context);
    } else {
      // options.publicPath 字符串将会被处理成以 / 结尾
      publicPath = `${
        options.publicPath.endsWith('/')
          ? options.publicPath
          : `${options.publicPath}/`
      }${url}`;
    }

    publicPath = JSON.stringify(publicPath);
  }

  // publicPath 的预处理过程
  // 这里和 options.publicPath 配置的区别是你将会得到一个即将最终作为 publicPath 的字符串进行加工
  // 从生命周期的角度来看 options.publicPath 在 options.postTransformPublicPath 之前起到作用
  if (options.postTransformPublicPath) {
    publicPath = options.postTransformPublicPath(publicPath);
  }

  // 【Todo】为什么无论有没有配置 emitFile，都调用 this.emitFile
  if (typeof options.emitFile === 'undefined' || options.emitFile) {
    // 生成文件
    this.emitFile(outputPath, content);
  }

  const esModule =
    typeof options.esModule !== 'undefined' ? options.esModule : true;

  return `${esModule ? 'export default' : 'module.exports ='} ${publicPath};`;
}

export const raw = true;
