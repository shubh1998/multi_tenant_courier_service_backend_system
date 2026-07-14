const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const appConfig = require('../config/app.config');

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const infoStream = fs.createWriteStream(path.join(logsDir, 'info.log'), { flags: 'a' });
const errorStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s) => String(s).replace(ANSI_RE, '');

const serialize = (arg) => {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  if (typeof arg === 'object' && arg !== null) {
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }
  return String(arg);
};

const format = (level, args) =>
  `[${new Date().toISOString()}] [${level}] ${args.map(serialize).join(' ')}\n`;

// info and warn both write to info.log + stdout — same pipeline, different level label.
const writeToInfo = (level) => (...args) => {
  const line = format(level, args);
  infoStream.write(stripAnsi(line));
  process.stdout.write(line);
};

const logger = {
  info: writeToInfo('INFO'),
  warn: writeToInfo('WARN'),
  error: (...args) => {
    const line = format('ERROR', args);
    const clean = stripAnsi(line);
    errorStream.write(clean);
    infoStream.write(clean);
    process.stderr.write(line);
  },
};

const httpLogger = morgan(appConfig.logFormat, {
  stream: {
    write: (msg) => {
      const line = `[${new Date().toISOString()}] [HTTP] ${msg}`;
      infoStream.write(stripAnsi(line));
      process.stdout.write(line);
    },
  },
});

module.exports = { httpLogger, logger };
