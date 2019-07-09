import { RUN_SOCKET, HOST, PORT, MAX_CONNECTION_ATTEMPTS } from './constants';

let instance = null;

class Socket {
    constructor() {
        this.connectionAttempts = 0;
        this.gameId = null;
        instance = this;
    }

    get instance() {
        return instance;
    }

    connect() {
        // Create WebSocket connection
        if (RUN_SOCKET) {
            this.socket = new WebSocket(`ws://${HOST}:${PORT}`);
            this.socket.onopen = event => {
                console.log('Connection opened.');
            };
        }
    }

    send(payload) {
        if (RUN_SOCKET) {
            if (this.connectionAttempts > MAX_CONNECTION_ATTEMPTS) {
                console.warn(
                    `Max retry attempts (${
                        this.connectionAttempts
                    }) reached. Could not connect to server. `
                );
            } else if (this.socket.readyState === 0) {
                console.warn('Connection not established yet.');
                this.connectionAttempts = this.connectionAttempts + 1;
                setTimeout(() => this.send(payload), 1000);
            } else if (this.socket.readyState === 3) {
                console.warn('Connection error. Reconnecting...');
                this.connectionAttempts = this.connectionAttempts + 1;
                this.disconnect();
                this.connect();
                setTimeout(() => this.send(payload), 1000);
            } else {
                console.log('Sent:', payload);
                const data = JSON.stringify({
                    ...payload,
                    gameId: this.gameId
                });
                this.socket.send(data);
            }
        }
    }

    receive(eventListener) {
        if (RUN_SOCKET) {
            this.socket.onmessage = event => {
                const payload = JSON.parse(event.data);
                console.log('Received:', payload);
                eventListener(payload);

                if (payload.gameId && !this.gameId) {
                    this.gameId = payload.gameId;
                }
            };
        }
    }

    disconnect() {
        if (RUN_SOCKET) {
            this.socket.close();
        }
    }
}

export default new Socket();
