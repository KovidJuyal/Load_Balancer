const chalk = require('chalk');
const dayjs = require('dayjs');

function timestamp() {
    return chalk.gray(`[${dayjs().format('HH:mm:ss')}]`);
}

function success(message) {
    console.log(`${timestamp()} ${chalk.green('✅')} ${message}`);
}

function info(message) {
    console.log(`${timestamp()} ${chalk.cyan('ℹ️')} ${message}`);
}

function warn(message) {
    console.log(`${timestamp()} ${chalk.yellow('⚠️')} ${message}`);
}

function error(message) {
    console.error(`${timestamp()} ${chalk.red('❌')} ${message}`);
}

module.exports = {
    success,
    info,
    warn,
    error
};
