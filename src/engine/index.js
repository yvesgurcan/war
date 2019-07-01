import {
    TILE_SIZE,
    PLAYER_VIEW_WIDTH,
    PLAYER_VIEW_HEIGHT
} from '../lib/constants';
import { getElem } from '../lib/utils';

let instance = null;

class Engine {
    constructor() {
        instance = this;
        this.drawWorld();
        this.drawGrid();
        this.drawThings();
        // this.gameLoop();
    }

    get engine() {
        return instance;
    }

    drawWorld() {
        const world = getElem('world');
        world.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        world.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;
        world.style.backgroundColor = 'green';
    }

    drawGrid() {
        const grid = getElem('grid');
        grid.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        grid.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;
        const gridContext = grid.getContext('2d');

        for (let y = 0; y <= PLAYER_VIEW_WIDTH; y++) {
            gridContext.fillStyle = 'black';
            gridContext.fillRect(
                y * TILE_SIZE,
                0,
                1,
                PLAYER_VIEW_HEIGHT * TILE_SIZE
            );
        }

        for (let x = 0; x <= PLAYER_VIEW_HEIGHT; x++) {
            gridContext.fillStyle = 'black';
            gridContext.fillRect(
                0,
                x * TILE_SIZE,
                PLAYER_VIEW_WIDTH * TILE_SIZE,
                1
            );
        }
    }

    drawThings() {
        const thingsMap = getElem('things');
        thingsMap.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        thingsMap.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;
        const thingsMapContext = thingsMap.getContext('2d');
        thingsMapContext.fillStyle = 'red';
        thingsMapContext.fillRect(
            3 * TILE_SIZE,
            3 * TILE_SIZE,
            1 * TILE_SIZE,
            1 * TILE_SIZE
        );

        thingsMapContext.fillRect(
            5 * TILE_SIZE,
            2 * TILE_SIZE,
            4 * TILE_SIZE,
            4 * TILE_SIZE
        );
    }

    gameLoop() {
        this.gameLoop();
    }
}

export default new Engine();
