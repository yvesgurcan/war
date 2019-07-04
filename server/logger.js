const { format, transports } = require('winston');
const { printf } = format;
const expressWinston = require('express-winston');

const expressFormat = printf(({ message }) => {
    return message;
});

module.exports.expressLogger = expressWinston.logger({
    transports: [
        new transports.Console(),
        new transports.File({ filename: './server/logs.log' })
    ],
    format: expressFormat,
    expressFormat: true,
    colorize: false
});
