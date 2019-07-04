const express = require('express');
const bodyParser = require('body-parser');
const winston = require('./logger');
const uuid = require('uuid');

const PORT = 3000;
const HOST = 'localhost';

global = {
    games: {}
};

const app = express();

app.use(bodyParser.json({ extended: false }));

app.use(winston.expressLogger);

app.all('/*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

app.get(`/game/state/:gameId`, (req, res) => {
    const { gameId } = req.params;
    const gameState = global.games[gameId];
    res.send(gameState);
});

app.post(`/game/state`, (req, res) => {
    const { data } = req.body;

    const gameId = uuid();

    global = {
        games: {
            ...global.games,
            [gameId]: {
                gameId,
                ...data
            }
        }
    };

    res.send({ gameId });
});

app.post(`/game/state/:gameId/event`, (req, res) => {
    const { gameId } = req.params;
    const { data } = req.body;
    const gameState = global.games[gameId];

    global = {
        games: {
            ...global.games,
            [gameId]: {
                gameId,
                ...gameState,
                ...data
            }
        }
    };

    res.send(global.games[gameId]);
});

app.delete(`/game/state/:gameId`, (req, res) => {
    const { gameId } = req.params;
    delete global.games[gameId];
    res.send(global.games[gameId]);
});

app.listen(PORT, HOST, () =>
    console.log(`War server listening at ${HOST}:${PORT}.\n`)
);
