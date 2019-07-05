import uuid from 'uuid';
import {
    TILE_SIZE,
    PLAYER_VIEW_WIDTH,
    PLAYER_VIEW_HEIGHT,
    WORLD_CLIMATES,
    RIGHT_CLICK,
    UNIT,
    MAX_FPS,
    BUILDING_NAMES,
    THING_TYPES
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
        this.lastCycle = null;
        this.buildPreview = null;
        this.currentPlayer = 0;

        instance = this;

        this.initWorld();
        this.initGrid();
        this.initMenu();
        this.initPlayers();
        this.initStore();
        this.initThings();
        this.listenToMouse();
        this.gameLoop();
    }

    get instance() {
        return instance;
    }

    /* Init */

    initWorld() {
        const worldCanvas = getElem('world');
        worldCanvas.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        worldCanvas.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;

        this.world = { ...world.metadata };
        worldCanvas.style.backgroundColor =
            WORLD_CLIMATES[world.metadata.climate].grass.color;
    }

    initGrid() {
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

    initMenu() {
        const thingDescrition = getElem('thing-description');
        thingDescrition.style.display = 'none';
        const actionMenu = getElem('action-menu');
        actionMenu.style.display = 'none';
        this.hideBuildMenu();
    }

    initPlayers() {
        this.players = players;
        this.currentPlayer = 0;
    }

    initStore() {
        store.add(world.things);
    }

    initThings() {
        const thingsContainer = getElem('things');
        const things = store.getArray(null, { aggregateType: true });
        things.forEach(thing => {
            const player = this.players[thing.owner];
            const image = createElem('img');
            image.id = thing.id;
            image.style.position = 'absolute';
            image.style.width = thing.width * TILE_SIZE + 1;
            image.style.height = thing.height * TILE_SIZE + 1;
            image.style.background = player.color;
            image.style.boxSizing = 'border-box';
            image.style.border = '1px solid black';
            image.style.left = thing.x * TILE_SIZE;
            image.style.top = thing.y * TILE_SIZE;
            image.title = JSON.stringify(thing, null, 2);
            thingsContainer.appendChild(image);
        });
    }

    /* Menus */

    showBuildMenu() {
        const buildMenu = getElem('build-menu');
        buildMenu.style.display = 'block';
    }

    hideBuildMenu() {
        const buildMenu = getElem('build-menu');
        buildMenu.style.display = 'none';
    }

    /* Player Interactions */

    handleSelectThing(thing) {
        const thingImage = getElem(thing.id);
        console.log('select');
        this.unselectAllThings();
        store.select([thing.id]);
        thingImage.style.border = '1px solid rgb(0, 200, 0)';
        thingImage.style.zIndex = 100;
        if (thing.builder) {
            this.showBuildMenu();
        }
    }

    unselectAllThings() {
        const selected = store.getSelectionArray();
        selected.forEach(thing => {
            const thingImage = getElem(thing.id);
            thingImage.style.border = '1px solid black';
            thingImage.style.zIndex = 90;
        });
        store.unselect();
        this.hideBuildMenu();
    }

    handleIntent(coordinates, things) {
        const updatedThings = things.map(thing => ({
            ...thing,
            goal: {
                x: Math.max(
                    0,
                    Math.min(this.world.width - thing.width, coordinates.x)
                ),
                y: Math.max(
                    0,
                    Math.min(this.world.height - thing.height, coordinates.y)
                )
            }
        }));

        store.update(updatedThings);
    }

    startBuildPreview(buildingType) {
        const thing = THING_TYPES[buildingType];
        this.buildPreview = {
            ...thing,
            type: buildingType,
            owner: this.currentPlayer
        };

        const thingsContainer = getElem('things');
        const image = createElem('img');
        image.id = 'build-preview';
        image.src = ''; // should be path to building visual design
        image.style.position = 'absolute';
        image.style.width = thing.width * TILE_SIZE + 1;
        image.style.height = thing.height * TILE_SIZE + 1;
        image.style.background = 'grey';
        image.style.boxSizing = 'border-box';
        image.style.border = '1px solid black';
        image.style.zIndex = -1; // don't show until the mouse moves on world view
        thingsContainer.appendChild(image);
    }

    stopBuildPreview() {
        this.buildPreview = null;
        const buildPreview = getElem('build-preview');
        buildPreview.parentNode.removeChild(buildPreview);
    }

    handleBuild() {
        const collides = store.getCollision(this.buildPreview);

        if (!collides) {
            const player = this.players[this.currentPlayer];
            const id = store.add([this.buildPreview])[0];
            const image = getElem('build-preview');
            image.id = id;
            image.style.background = player.color;
            image.style.zIndex = null;
            image.title = JSON.stringify({ id, ...this.buildPreview }, null, 2);
            this.buildPreview = null;
        }
    }

    listenToMouse() {
        document.onclick = event => {
            const id = event.target.id;
            const rect = event.target.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
            const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
            const target = store.getById(id, {
                aggregateType: true
            });
            const coordinates = { x, y };

            const selected = store.getSelectionArray({ aggregateThings: true });

            if (!this.buildPreview && BUILDING_NAMES.includes(id)) {
                console.log('start build preview');
                this.startBuildPreview(id);
            } else if (this.buildPreview) {
                console.log('build');
                this.handleBuild();
            } else if (selected.length > 0 && !target) {
                const selectedIds = selected.map(thing => thing.id);
                const thingDetails = store.getArray(selectedIds, {
                    aggregateType: true
                });
                const areUnits = thingDetails.some(
                    thing => thing.class === UNIT
                );
                if (areUnits) {
                    console.log('move units');
                    this.handleIntent(coordinates, thingDetails);
                } else {
                    console.log('unselect');
                    this.unselectAllThings();
                }
            } else if (target) {
                this.handleSelectThing(target);
            } else {
                console.log('nothing');
            }
        };

        document.oncontextmenu = event => {
            event.preventDefault();
            if (this.buildPreview) {
                console.log('stop build preview');
                this.stopBuildPreview();
            } else {
                console.log('unselect all');
                this.unselectAllThings();
            }
        };

        document.onmousemove = event => {
            if (this.buildPreview) {
                const x = Math.floor(event.clientX / TILE_SIZE);
                const y = Math.floor(event.clientY / TILE_SIZE);

                this.updateBuildPreview({
                    ...this.buildPreview,
                    x,
                    y
                });
            }
        };
    }

    /* Artificial Intelligence */

    getCloserToGoal(source, goal) {
        const { speed } = source;
        let destination = { x: source.x, y: source.y };

        let direction = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        if (source.x < goal.x) {
            direction.right = true;
            destination.x = Math.min(goal.x, source.x + speed);
        } else if (source.x > goal.x) {
            direction.left = true;
            destination.x = Math.max(goal.x, source.x - speed);
        }

        if (source.y < goal.y) {
            direction.down = true;
            destination.y = Math.min(goal.y, source.y + speed);
        } else if (source.y > goal.y) {
            direction.up = true;
            destination.y = Math.max(goal.y, source.y - speed);
        }

        const collides = store.getCollisionWhileMoving(
            source,
            destination,
            direction
        );

        // can't go there
        if (collides) {
            const snapX = direction.right
                ? Math.ceil(source.x)
                : Math.floor(source.x);
            const snapY = direction.down
                ? Math.ceil(source.y)
                : Math.floor(source.y);
            return {
                x: snapX,
                y: snapY,
                done: true // could not find a different itinerary
            };
        }

        return {
            ...destination,
            done: destination.x === goal.x && destination.y === goal.y
        };
    }

    /* Game Loop */

    updateThings() {
        const things = store.getArray(null, { aggregateType: true });
        things.forEach(thing => {
            const { goal, x, y, id, speed } = thing;
            if (goal && (goal.x !== x || goal.y !== y)) {
                const updatedCoordinates = this.getCloserToGoal(thing, goal);

                const updatedThing = {
                    ...thing,
                    x: updatedCoordinates.x,
                    y: updatedCoordinates.y
                };

                if (updatedCoordinates.done) {
                    delete updatedThing.goal;
                }

                store.update([updatedThing], { replace: true });

                const image = getElem(id);
                image.style.left = updatedCoordinates.x * TILE_SIZE;
                image.style.top = updatedCoordinates.y * TILE_SIZE;
                image.title = JSON.stringify(thing, null, 2);
            }
        });
    }

    updateBuildPreview(preview) {
        if (
            preview.x < 0 ||
            preview.x + preview.width - 1 >= this.world.width ||
            preview.y < 0 ||
            preview.y + preview.height - 1 >= this.world.height
        ) {
            return false;
        }

        const image = getElem('build-preview');
        image.style.left = preview.x * TILE_SIZE;
        image.style.top = preview.y * TILE_SIZE;
        if (image.style.zIndex !== 100) {
            image.style.zIndex = 100;
        }

        this.buildPreview = { ...preview };
    }

    gameLoop() {
        this.updateThings();

        const now = new Date().getTime();

        // time since last game logic
        const timeDelta = now - this.lastCycle;

        let cycleDelay = MAX_FPS;
        if (timeDelta > cycleDelay) {
            cycleDelay = Math.max(1, cycleDelay - (timeDelta - cycleDelay));
        }

        this.showFPS(timeDelta);
        this.lastCycle = now;

        setTimeout(() => this.gameLoop(), cycleDelay);
    }

    showFPS(timeDelta) {
        const fps = (1000 / timeDelta).toFixed(0);
        const fpsElem = getElem('fps');
        if (fpsElem) {
            fpsElem.innerHTML = fps;
        } else {
            // console.log(`fps: ${Number(fps.toFixed(1))}`);
        }
    }
}

export default new Engine();
