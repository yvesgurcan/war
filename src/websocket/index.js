import { HOST, PORT } from './constants';

let instance = null;

class Socket {
    constructor() {
        this.gameId = null;
        instance = this;
    }

    get instance() {
        return instance;
    }

    connect() {
        // Create WebSocket connection
        this.socket = new WebSocket(`ws://${HOST}:${PORT}`);
        this.socket.onopen = () => {
            console.log('Connection opened.');
        };
    }

    send(payload) {
        if (this.socket.readyState === 0) {
            console.warn('Connection not established yet.');
            setTimeout(() => this.send(payload), 1000);
        } else if (this.socket.readyState === 3) {
            console.warn('Connection error. Reconnecting...');
            this.disconnect();
            this.connect();
            setTimeout(() => this.send(payload), 1000);
        } else {
            console.log('Sent:', payload);
            const data = JSON.stringify({ ...payload, gameId: this.gameId });
            this.socket.send(data);
        }
    }

    receive(eventListener) {
        this.socket.onmessage = event => {
            const payload = JSON.parse(event.data);
            console.log('Received:', payload);
            eventListener(payload);

            if (payload.gameId && !this.gameId) {
                this.gameId = payload.gameId;
            }
        };
    }

    disconnect() {
        this.socket.close();
    }
}

export default new Socket();
