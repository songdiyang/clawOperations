import winston from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 获取日志级别，默认为 info
 */
const getLogLevel = (): string => {
  return process.env.LOG_LEVEL || 'info';
};

/**
 * 创建日志格式
 */
const createLogFormat = (moduleName: string) => {
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] [${moduleName}] ${message}`;
    })
  );
};

/**
 * 创建 Logger 实例的工厂函数
 * @param moduleName 模块名称，用于日志标识
 * @returns winston Logger 实例
 */
export function createLogger(moduleName: string): winston.Logger {
  const logLevel = getLogLevel();
  const logFormat = createLogFormat(moduleName);

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        ),
      }),
      // File transport
      new winston.transports.File({
        filename: 'app.log',
        format: logFormat,
      }),
    ],
  });

  return logger;
}

// 导出默认 logger
export const logger = createLogger('App');

export default { createLogger, logger };
