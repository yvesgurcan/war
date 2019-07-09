const WebSocket = require('ws');
const uuid = require('uuid');

const { CONNECTION, UNKNOWN, NEW_GAME } = require('./constants');

const wss = new WebSocket.Server({ port: 3000 });

const sendJSON = (ws, payload) => {
    console.log('Sent:', payload);
    return ws.send(JSON.stringify(payload));
};

wss.on('connection', ws => {
    console.log('---');
    console.log('Connection opened.');

    let gameId = null;

    ws.on('message', payload => {
        const { event, data } = JSON.parse(payload);
        console.log('Received:', { event, data });

        let response = { event };

        switch (event) {
            default: {
                console.error('Unknown event --', { event, data });
                sendJSON(ws, { event: UNKNOWN, gameId });
                return;
            }
            case NEW_GAME: {
                gameId = uuid();
                response.data = { gameId };
                break;
            }
        }

        sendJSON(ws, { ...response, gameId });
    });

    sendJSON(ws, { event: CONNECTION, data: { success: true } });

    ws.on('close', () => {
        console.log('Connection closed:', { gameId });
        console.log('---');
    });
});
