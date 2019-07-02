import uuid from 'uuid';
import {
    TILE_SIZE,
    PLAYER_VIEW_WIDTH,
    PLAYER_VIEW_HEIGHT,
    WORLD_CLIMATES,
    THING_TYPES,
    RIGHT_CLICK
} from './constants';
import { getElem, createElem } from './utils';

import store from './store';
import world from '../worlds/world1';

let instance = null;

let players = [
    {
        id: uuid(),
        color: 'rgb(180, 0, 0)',
        race: 'human'
    },
    {
        id: uuid(),
        color: 'rgb(0, 0, 180)',
        race: 'human'
    }
];

class Engine {
    constructor() {
        instance = this;
        this.initWorld();
        this.drawGrid();
        this.initPlayers();
        this.initStore();
        this.initThings();
        this.listenToMouse();
        // this.gameLoop();
    }

    get instance() {
        return instance;
    }

    initWorld() {
        const worldCanvas = getElem('world');
        worldCanvas.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        worldCanvas.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;

        this.world = { ...world.metadata };
        worldCanvas.style.backgroundColor =
            WORLD_CLIMATES[world.metadata.climate].grass.color;
    }

    drawGrid() {
        const gridCanvas = getElem('grid');
        gridCanvas.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        gridCanvas.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;
        const gridContext = gridCanvas.getContext('2d');

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

    initPlayers() {
        this.players = players;
    }

    initStore() {
        store.add(world.things);
    }

    initThings() {
        const thingsContainer = getElem('things');
        const things = store.getArray();
        things.forEach(thing => {
            const player = this.players[thing.owner];
            const thingType = THING_TYPES[thing.type];
            const image = createElem('img');
            image.id = thing.id;
            image.style.pointerEvents = 'none';
            image.style.position = 'absolute';
            image.style.left = thing.x * TILE_SIZE;
            image.style.top = thing.y * TILE_SIZE;
            image.style.width = thingType.width * TILE_SIZE;
            image.style.height = thingType.height * TILE_SIZE;
            image.style.background = player.color;
            image.style.boxSizing = 'border-box';
            thingsContainer.appendChild(image);
        });
    }

    handleSelectThing(thing) {
        const thingImage = getElem(thing.id);
        if (thing.selected) {
            store.unselect([thing.id]);
            thingImage.style.border = 'none';
        } else {
            store.select([thing.id]);
            thingImage.style.border = '1px solid rgb(0, 200, 0)';
        }
    }

    unselectAll() {
        const selected = store.getSelectionArray();
        selected.forEach(thing => {
            const thingImage = getElem(thing.id);
            thingImage.style.border = 'none';
        });
        store.unselect();
    }

    listenToMouse() {
        document.onclick = event => {
            var rect = event.target.getBoundingClientRect();
            var x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
            var y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
            const thing = store.getAtCoordinates(x, y, true);

            if (event.which === RIGHT_CLICK) {
                this.unselectAll();
            } else if (thing) {
                this.handleSelectThing(thing);
            }
        };

        document.oncontextmenu = event => {
            event.preventDefault();
        };
    }

    gameLoop() {
        this.drawThings();
        this.gameLoop();
    }
}

export default new Engine();
