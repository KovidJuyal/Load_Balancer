// logger.js
const chalk = require('chalk');
const dayjs = require('dayjs');

function log(type, message) {
    const timestamp = dayjs().format('HH:mm:ss');
    const prefix = chalk.gray(`[${timestamp}]`);

    const types = {
        info: chalk.blue('ℹ️ INFO'),
        success: chalk.green('✅ SUCCESS'),
        warn: chalk.yellow('⚠️ WARN'),
        error: chalk.red('❌ ERROR'),
        event: chalk.magenta('🔄 EVENT'),
        request: chalk.cyan('📥 REQ'),
        response: chalk.green('📤 RES'),
        health: chalk.whiteBright('📊 HEALTH'),
    };

    const tag = types[type] || chalk.white(type.toUpperCase());
    console.log(`${prefix} ${tag} - ${message}`);
}

module.exports = log;
