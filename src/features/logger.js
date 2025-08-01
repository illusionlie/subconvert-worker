const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
  none: 5,
};

export default class Logger {
  /**
   * @param {Request} request 请求
   * @param {Env} env 环境变量
   * @param {ExecutionContext} ctx 执行上下文
   */
  constructor(request, env, ctx) {
    this.request = request;
    this.env = env;
    this.ctx = ctx;

    // 从环境变量中获取日志级别
    // 开发环境默认为 info，生产环境默认为 warn
    const defaultLogLevel = env.ENVIRONMENT === 'development' ? 'info' : 'warn';
    this.logLevel = logLevels[env.LOG_LEVEL?.toLowerCase() || defaultLogLevel];
    
    // 检查请求头以确定是否需要覆盖日志级别
    this.debugOverride = request.headers.get('X-Debug-Log') === 'true';
  }

  /**
   * 日志记录核心
   * @private
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {object} [data={}] 附加数据
   */
  _log(level, message, data = {}) {
    const levelNumber = logLevels[level];

    // 条件检查：
    // 1. 该消息的日志级别是否足够高以被记录
    // 2. 是否存在调试覆盖 header
    // 如果两者均不成立，则不执行任何操作
    if (levelNumber < this.logLevel && !this.debugOverride) {
      return;
    }
    
    const logObject = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      // 自动为日志添加请求上下文
      context: {
        requestId: this.request.headers.get('cf-request-id'),
        url: this.request.url,
        method: this.request.method,
        colo: this.request.cf?.colo,
        country: this.request.cf?.country,
      },
      // 合并任何提供的自定义数据
      ...data,
    };

    // 使用不同的控制台方法。这有助于在某些日志查看器中进行过滤
    // 使用 JSON.stringify 生成结构化且可搜索的日志
    switch (level) {
      case 'error':
      case 'fatal':
        console.error(JSON.stringify(logObject));
        break;
      case 'warn':
        console.warn(JSON.stringify(logObject));
        break;
      case 'info':
        console.info(JSON.stringify(logObject));
        break;
      default:
        console.log(JSON.stringify(logObject));
        break;
    }
  }

  // Public-facing log methods
  debug(message, data) {
    this._log('debug', message, data);
  }

  info(message, data) {
    this._log('info', message, data);
  }

  warn(message, data) {
    this._log('warn', message, data);
  }

  error(message, data) {
    // 如果 message 是一个 Error 对象，则将其转换为可记录的对象
    if (message instanceof Error) {
        const errorData = {
            error: {
                message: message.message,
                stack: message.stack,
                name: message.name,
            },
            ...data
        };
        this._log('error', message.message, errorData);
    } else {
        this._log('error', message, data);
    }
  }
}