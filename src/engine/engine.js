import uuid from 'uuid';
import {
    TILE_SIZE,
    PLAYER_VIEW_WIDTH,
    PLAYER_VIEW_HEIGHT,
    WORLD_CLIMATES,
    UNIT,
    MAX_FPS,
    BUILDING_NAMES,
    THING_TYPES,
    GOLD_MINE,
    NEW_GAME,
    INIT_WORLD,
    TILE
} from './constants';

import socket from '../websocket';
window.socket = socket.instance;

import { getElem, createElem } from './utils';
import store from './store';
import world from '../worlds/world1';

const instaBuild = false;
const showGrid = false;
const showThingImages = true;

let instance = null;

let players = [
    {
        id: uuid(),
        color: 'rgb(30, 30, 240)',
        race: 'human',
        gold: 1000,
        lumber: 1000,
        oil: 1000
    },
    {
        id: uuid(),
        color: 'rgb(180, 0, 0)',
        race: 'human',
        gold: 5000,
        lumber: 2000,
        oil: 1000
    }
];

class Engine {
    constructor() {
        this.lastCycle = null;
        this.buildPreview = null;
        this.currentPlayer = 0;

        instance = this;
        this.initConnection();
        this.initWorld();
        this.initGrid();
        this.initMenu();
        this.initPlayers();
        this.initThings();
        this.initResources();
        this.listenToMouse();
        this.gameLoop();
    }

    get instance() {
        return instance;
    }

    /* Init */

    initConnection() {
        this.connection = socket;
        this.connection.connect();
        this.connection.receive(this.listenToConnection);
        this.connection.send({ event: NEW_GAME });
    }

    initWorld() {
        const worldCanvas = getElem('world');
        worldCanvas.width = PLAYER_VIEW_WIDTH * TILE_SIZE;
        worldCanvas.height = PLAYER_VIEW_HEIGHT * TILE_SIZE;

        this.world = { ...world.metadata };
        worldCanvas.style.backgroundColor =
            WORLD_CLIMATES[world.metadata.climate].grass.color;

        this.connection.send({
            event: INIT_WORLD,
            data: { world: this.world }
        });
    }

    initGrid() {
        if (showGrid) {
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
    }

    initMenu() {
        const inGameMenu = getElem('in-game-menu');
        inGameMenu.style.width = TILE_SIZE * PLAYER_VIEW_WIDTH;
        inGameMenu.style.top = TILE_SIZE * PLAYER_VIEW_HEIGHT + 32 + 1;

        const resourceBar = getElem('resource-bar');
        resourceBar.style.width = TILE_SIZE * PLAYER_VIEW_WIDTH;

        const fpsIndicator = getElem('fps');
        fpsIndicator.style.left = TILE_SIZE * PLAYER_VIEW_WIDTH + 10;
        fpsIndicator.style.top = 32;

        this.hideBuildMenu();
        this.hideThingDescription();
    }

    initPlayers() {
        this.players = players;
        this.currentPlayer = 0;
    }

    initThings() {
        world.things.forEach(thing => {
            const thingWithType = {
                ...thing,
                ...THING_TYPES[thing.type]
            };
            const thingInstance = this.instantiateThing(thing);
            this.spawnThing({ ...thingWithType, ...thingInstance });
        });
    }

    initResources() {
        this.players.forEach((player, playerIndex) => {
            const food = store
                .getUnitsByPlayer(playerIndex)
                .map(unit => unit.food || 0)
                .reduce((sum, value) => sum + value, 0);

            const foodProduction = store
                .getBuildingsByPlayer(playerIndex)
                .map(unit => unit.foodProduction || 0)
                .reduce((sum, value) => sum + value, 0);

            this.updateResources(playerIndex, { food, foodProduction });
        });
    }

    /* Resources */

    updateResources(
        playerIndex,
        {
            gold: gDelta = 0,
            lumber: lDelta = 0,
            oil: oDelta = 0,
            food: fDelta = 0,
            foodProduction: fpDelta = 0
        }
    ) {
        const {
            gold = 0,
            lumber = 0,
            oil = 0,
            food = 0,
            foodProduction = 0
        } = this.players[playerIndex];
        this.players[playerIndex] = {
            ...this.players[playerIndex],
            gold: gold + (gDelta || 0),
            lumber: lumber + (lDelta || 0),
            oil: oil + (oDelta || 0),
            food: food + (fDelta || 0),
            foodProduction: foodProduction + (fpDelta || 0)
        };

        if (playerIndex === this.currentPlayer) {
            const { gold, lumber, oil, food, foodProduction } = this.players[
                playerIndex
            ];
            this.updateResourceDisplays({
                gold,
                lumber,
                oil,
                food,
                foodProduction
            });
        }
    }

    updateResourceDisplays({ gold, lumber, oil, food, foodProduction }) {
        const goldElement = getElem('gold');
        goldElement.innerHTML = gold;
        const lumberElement = getElem('lumber');
        lumberElement.innerHTML = lumber;
        const oilElement = getElem('oil');
        oilElement.innerHTML = oil;
        const foodElement = getElem('food-used');
        foodElement.innerHTML = food;
        const foodProductionElement = getElem('food-max');
        foodProductionElement.innerHTML = foodProduction;

        if (
            Number(foodElement.innerHTML) >
            Number(foodProductionElement.innerHTML)
        ) {
            foodElement.style.color = 'rgb(200, 0, 0)';
        } else {
            foodElement.style.color = 'inherit';
        }
    }

    canAffordBuild(playerIndex, thing) {
        const {
            gold: gDelta,
            lumber: lDelta,
            oil: oDelta,
            food: fDelta
        } = thing;
        const { gold, lumber, oil, food, foodProduction } = this.players[
            playerIndex
        ];

        if (
            gold - gDelta < 0 ||
            lumber - lDelta < 0 ||
            oil - oDelta < 0 ||
            (fDelta > 0 && food + (fDelta > foodProduction))
        ) {
            return false;
        }

        return true;
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

    showThingDescription() {
        const thingDescription = getElem('thing-description');
        thingDescription.style.display = 'block';
    }

    hideThingDescription() {
        const thingDescription = getElem('thing-description');
        thingDescription.style.display = 'none';
    }

    updateThingDescription(thing) {
        if (!thing) {
            this.hideThingDescription();
        } else {
            this.showThingDescription();
            const thingName = getElem('thing-name');
            thingName.innerHTML = thing.displayName;
            const thingHealthRatio = getElem('thing-health-ratio');
            if (thing.health === undefined && thing.maxHealth === undefined) {
                thingHealthRatio.style.display = 'none';
            } else {
                thingHealthRatio.style.display = 'block';
                const thingHealth = getElem('thing-health');
                thingHealth.innerHTML = thing.health;
                const thingMaxHealth = getElem('thing-maxhealth');
                thingMaxHealth.innerHTML = thing.maxHealth;

                const currentHealth = getElem('thing-current-health-bar');

                const healthPercentage = thing.health/thing.maxHealth*100;
                currentHealth.style.width = `${healthPercentage}%`;
                if (healthPercentage < 20) {
                    currentHealth.style.background = 'red';
                } else if (healthPercentage < 60) {
                    currentHealth.style.background = 'yellow';
                } else {
                    currentHealth.style.background = 'green';
                }
            }

            const goldContained = getElem('gold-contained');
            if (thing.goldContained !== undefined) {
                goldContained.innerHTML = thing.goldContained;
            } else {
                goldContained.innerHTML = '';
            }
        }
    }

    /* Selection */

    selectThing(thing) {
        const image = getElem(thing.id);
        console.log('select');
        this.unselectAllThings();
        store.select([thing.id]);
        image.style.border = thing.noBorder
            ? '1px solid transparent'
            : '1px solid rgb(0, 200, 0)';
        image.style.zIndex = 100;

        this.updateThingDescription(thing);
        if (thing.builder) {
            this.showBuildMenu();
        }
    }

    unselectThing(thing) {
        const image = getElem(thing.id);
        if (image) {
            image.style.border =
                !image.error || thing.noBorder
                    ? '1px solid transparent'
                    : '1px solid black';
            image.style.zIndex = 90;
        }
        store.unselect([thing.id]);
        this.hideBuildMenu();
        this.updateThingDescription();
    }

    unselectAllThings() {
        const selected = store.getSelectionArray({ aggregateType: true });
        selected.forEach(thing => {
            const image = getElem(thing.id);
            if (image) {
                image.style.border =
                    !image.error || thing.noBorder
                        ? '1px solid transparent'
                        : '1px solid black';
                image.style.zIndex = 90;
            }
        });
        store.unselect();
        this.hideBuildMenu();
        this.updateThingDescription();
    }

    /* Build */

    startBuildPreview(type) {
        const thing = THING_TYPES[type];

        const canAffordBuild = this.canAffordBuild(this.currentPlayer, thing);
        if (canAffordBuild) {
            if (this.buildPreview) {
                this.stopBuildPreview();
            }

            this.buildPreview = {
                ...thing,
                type,
                owner: this.currentPlayer
            };

            const sprite = this.getSprite({ ...thing, type });

            const thingsContainer = getElem('things');
            const image = createElem('img');
            image.id = 'build-preview';
            image.src = sprite;
            image.style.position = 'absolute';
            image.style.width = thing.width * TILE_SIZE + 1;
            image.style.height = thing.height * TILE_SIZE + 1;
            image.style.boxSizing = 'border-box';
            image.style.background = 'rgb(0, 180, 0)';
            image.style.opacity = 0.5;
            image.style.zIndex = -1; // don't show until the mouse moves on world view

            if (TILE_SIZE >= 32 && thing.class !== TILE) {
                image.style.objectFit = 'none';
            }

            image.onerror = () => {
                image.error = true;
                image.style.border = '1px solid black';
            };

            image.onload = () => {
                image.error = false;
                image.style.border = '1px solid transparent';
            };

            thingsContainer.appendChild(image);
        }
    }

    stopBuildPreview() {
        this.buildPreview = null;
        const buildPreview = getElem('build-preview');
        buildPreview.parentNode.removeChild(buildPreview);
    }

    handleBuildIntent(selected) {
        const { x, y } = this.buildPreview;
        if (x !== undefined && y !== undefined) {
            const collides = store.getCollision(this.buildPreview);
            if (!collides) {
                const canAffordBuild = this.canAffordBuild(
                    this.currentPlayer,
                    this.buildPreview
                );
                if (canAffordBuild) {
                    this.handleIntent(
                        { x, y },
                        selected,
                        'build',
                        this.buildPreview
                    );
                    this.stopBuildPreview();
                }
            }
        }
    }

    handleBuild(thing, target) {
        const builder = store.sanitizeThing(thing);
        const collides = store.getCollision(target, builder);
        if (!collides) {
            const canAffordBuild = this.canAffordBuild(
                this.currentPlayer,
                target
            );
            if (canAffordBuild) {
                const thing = {
                    ...target,
                    owner: this.currentPlayer,
                    thingsHosted: [builder.id]
                };

                const instantiatedThing = this.instantiateThing(thing, {
                    startBuild: true
                });
                this.spawnThing(
                    { ...instantiatedThing },
                    {
                        startBuild: true
                    }
                );

                const { gold, lumber, oil } = instantiatedThing;
                this.updateResources(this.currentPlayer, {
                    gold: -gold,
                    lumber: -lumber,
                    oil: -oil
                });

                this.destroyThing(builder);
            }
        }
    }

    handleBuildFinished(thing) {
        delete thing.timeToBuild;
        const { thingsHosted, foodProduction } = thing;

        if (thingsHosted) {
            thingsHosted.map(hostedThingId => {
                const builder = store.getById(hostedThingId, {
                    aggregateType: true
                });
                const { x, y, failed } = this.findNextSpotAvailable(
                    thing,
                    builder
                );
                if (!failed) {
                    const updatedBuilder = {
                        ...builder,
                        x,
                        y
                    };

                    store.update([updatedBuilder]);
                    this.spawnThing(updatedBuilder);
                } else {
                    console.warn(
                        `Thing '${builder.id}' of type '${
                            builder.type
                        }' was removed from the world.`
                    );
                    store.remove([builder]);
                }
            });
        }

        if (foodProduction > 0) {
            this.updateResources(this.currentPlayer, { foodProduction });
        }

        const image = getElem(thing.id);
        image.title = JSON.stringify(thing, null, 2);
        store.update([thing], { replace: true });
    }

    /* Harvest */

    handleHarvestIntent(harvesters, resource) {
        const { x, y } = resource;
        this.handleIntent({ x, y }, harvesters, 'harvest', resource);
    }

    handleHarvest(harvester, target) {
        const resource = {
            ...target,
            thingsHosted: [...(target.thingsHosted || []), harvester.id]
        };

        let amountHarvested = 0;
        let resourceHarvested = null;
        if (resource.type === GOLD_MINE) {
            resourceHarvested = 'gold';
            const goldContained = Math.max(0, resource.goldContained - 100);
            amountHarvested = Math.min(100, goldContained);

            resource.goldContained = goldContained;

            const image = getElem(resource.id);
            image.src = this.getSprite(resource, { name: 'active' });
            store.update([resource]);

            const isSelected = store.isSelected(resource);
            if (isSelected) {
                this.updateThingDescription(resource);
            }
        }

        this.destroyThing(harvester);

        setTimeout(
            () =>
                this.handleHarvestFinished(
                    harvester.id,
                    resource.id,
                    resourceHarvested,
                    amountHarvested
                ),
            resource.harvestTime
        );
    }

    handleHarvestFinished(
        harvesterId,
        resourceId,
        resourceHarvested,
        amountHarvested
    ) {
        const harvester = store.getById(harvesterId, { aggregateType: true });
        const resource = store.getById(resourceId, { aggregateType: true });

        if (!resource) {
            return;
        }

        const { thingsHosted } = resource;

        const { x, y, failed } = this.findNextSpotAvailable(
            resource,
            harvester
        );
        if (!failed) {
            const updatedHarvester = {
                ...harvester,
                x,
                y,
                resourceHarvested,
                amountHarvested
            };

            let updatedResource = { ...resource };
            if (resource.type === GOLD_MINE) {
                const updatedThingsHosted = thingsHosted.filter(
                    id => id !== harvester.id
                );

                updatedResource = {
                    ...resource,
                    thingsHosted: updatedThingsHosted
                };

                if (updatedResource.goldContained <= 0) {
                    if (updatedResource.thingsHosted.length > 0) {
                        store.update([updatedHarvester]);
                        updatedResource.thingsHosted.forEach(thingId =>
                            this.handleHarvestInterrupted(thingId, resource)
                        );
                    }

                    this.destroyThing(resource);
                    store.remove([resource]);
                } else if (updatedThingsHosted.length === 0) {
                    const image = getElem(resource.id);
                    image.src = this.getSprite(resource);
                }
            }

            store.update([updatedHarvester, updatedResource]);
            this.spawnThing(updatedHarvester, { name: '066' });
        } else {
            console.warn(
                `Thing '${harvester.id}' of type '${
                    harvester.type
                }' was removed from the world.`
            );
            store.remove([harvester]);
        }
    }

    handleHarvestInterrupted(harvesterId, resource) {
        const harvester = store.getById(harvesterId, { aggregateType: true });
        const { x, y, failed } = this.findNextSpotAvailable(
            resource,
            harvester
        );

        if (!failed) {
            const updatedHarvester = {
                ...harvester,
                x,
                y
            };

            store.update([updatedHarvester]);
            this.spawnThing(updatedHarvester);
        } else {
            console.warn(
                `Thing '${harvester.id}' of type '${
                    harvester.type
                }' was removed from the world.`
            );
            store.remove([harvester]);
        }
    }

    findNextSpotAvailable(source, thingToSpawn) {
        let spotFound = false;

        let maxAttempts;
        let attempts;

        let projection = {
            width: thingToSpawn.width,
            height: thingToSpawn.height
        };

        // left
        maxAttempts = source.height;
        attempts = 0;
        while (!spotFound && attempts <= maxAttempts) {
            projection = {
                ...projection,
                x: source.x - 1,
                y: source.y + attempts
            };

            // stay within the world boundaries
            if (projection.x >= 0 && projection.y < this.world.height) {
                spotFound = !store.getCollision(projection);
            }
            attempts++;
        }

        // bottom
        maxAttempts = source.width;
        attempts = 0;
        while (!spotFound && attempts <= maxAttempts) {
            projection = {
                ...projection,
                x: source.x + attempts,
                y: source.y + source.height
            };

            // stay within the world boundaries
            if (projection.y < this.world.height) {
                spotFound = !store.getCollision(projection);
            }
            attempts++;
        }

        // right
        maxAttempts = source.height;
        attempts = 0;
        while (!spotFound && attempts <= maxAttempts) {
            projection = {
                ...projection,
                x: source.x + source.width,
                y: source.y + source.height - 1 - attempts
            };

            // stay within the world boundaries
            if (projection.x < this.world.width) {
                spotFound = !store.getCollision(projection);
            }
            attempts++;
        }

        // top
        maxAttempts = source.width;
        attempts = 0;
        while (!spotFound && attempts <= maxAttempts) {
            projection = {
                ...projection,
                x: source.x + source.width - 1 - attempts,
                y: source.y - 1
            };

            // stay within the world boundaries
            if (projection.x >= 0 && projection.y >= 0) {
                spotFound = !store.getCollision(projection);
            }
            attempts++;
        }

        if (!spotFound) {
            console.warn(
                `Could not find an adjacent spot to spawn '${
                    thingToSpawn.id
                }' from '${source.id}'.`,
                { thingToSpawn, source }
            );
            return { failed: true };
        }

        console.log(`found a spot for '${thingToSpawn.id}'`, { ...projection });

        return { ...projection };
    }

    /* Mouse Listeners */

    handleIntent(coordinates, things, intent = null, target = null) {
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
                ),
                intent: intent,
                target
            }
        }));

        store.update(updatedThings);
    }

    listenToMouse() {
        document.onclick = event => {
            const id = event.target.id;
            const { top, left } = event.target.getBoundingClientRect();
            const x = Math.floor((event.clientX - left) / TILE_SIZE);
            const y = Math.floor((event.clientY - top) / TILE_SIZE);
            const target = store.getById(id, {
                aggregateType: true
            });
            const coordinates = { x, y };

            const selected = store.getSelectionArray({ aggregateThings: true });
            const selectedIds = selected.map(thing => thing.id);
            const thingDetails = store.getArray(selectedIds, {
                aggregateType: true
            });

            if (BUILDING_NAMES.includes(id)) {
                console.log('start build preview');
                this.startBuildPreview(id);
            } else if (this.buildPreview) {
                console.log('build intent');
                this.handleBuildIntent(thingDetails);
            } else if (selected.length > 0 && !target) {
                if (id !== 'grid' && id !== 'world') {
                    console.log('out of bounds');
                    return;
                }
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
            } else if (target && !target.unselectable) {
                const harvesters = thingDetails.filter(
                    thing => thing.harvester
                );
                if (harvesters.length > 0 && target.type === GOLD_MINE) {
                    const areEmpty = thingDetails.filter(
                        thing => !thing.resourceHarvested
                    );
                    if (areEmpty.length > 0) {
                        console.log('harvest');
                        this.handleHarvestIntent(areEmpty, target);
                    }
                } else {
                    this.selectThing(target);
                }
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
                const thingsContainer = getElem('things');
                const { top, left } = thingsContainer.getBoundingClientRect();
                const x = Math.floor((event.clientX - left) / TILE_SIZE);
                const y = Math.floor((event.clientY - top) / TILE_SIZE);

                this.updateBuildPreview({
                    ...this.buildPreview,
                    x,
                    y
                });
            }
        };
    }

    /* Server Listener */

    listenToConnection(payload) {
        const { event, data, gameId } = payload;
        if (gameId && !instance.gameId) {
            instance.gameId = gameId;
        }
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

        const collisionThing = store.getCollisionWhileMoving(
            source,
            destination,
            direction
        );

        if (collisionThing) {
            const snapX = direction.right
                ? Math.ceil(source.x)
                : Math.floor(source.x);
            const snapY = direction.down
                ? Math.ceil(source.y)
                : Math.floor(source.y);

            // reached goal
            if (collisionThing.id === (goal.target && goal.target.id)) {
                return {
                    x: snapX,
                    y: snapY,
                    reached: true
                };
            }

            // could not find a different itinerary
            return {
                x: snapX,
                y: snapY,
                interrupted: true
            };
        }

        return {
            ...destination,
            reached: destination.x === goal.x && destination.y === goal.y
        };
    }

    /* Game Loop */

    instantiateThing(thing, { startBuild = false } = {}) {
        const thingType = THING_TYPES[thing.type];
        if (!thingType) {
            console.error(
                `Could not instantiate thing of type '${thing.type}'.`,
                { thing }
            );
            return null;
        }

        const { maxHealth, buildTime } = thingType;
        const thingInstance = {
            ...thing,
            health: startBuild ? 0 : maxHealth,
            ...(startBuild && { timeToBuild: buildTime })
        };

        const id = store.add([thingInstance])[0];
        return { id, ...thingInstance };
    }

    getSprite(thing, { name = '001' } = {}) {
        if (!showThingImages) {
            return '';
        }

        const { climate } = this.world;
        const { image, class: thingClass, type } = thing;

        if (image) {
            return `/assets/${climate}/units/${image}.png`;
        }

        return `/assets/${climate}/${thingClass}s/${type}/${name}.png`;
    }

    spawnThing(thing, { startBuild = false, name = undefined } = {}) {
        if (!thing.id) {
            console.error(
                `Could not spawn thing of type '${
                    thing.type
                }'. No ID provided.`,
                { thing }
            );
            return;
        }

        const thingsContainer = getElem('things');
        const { top, left } = thingsContainer.getBoundingClientRect();

        const image = createElem('img');
        image.id = thing.id;
        image.style.position = 'absolute';
        image.style.boxSizing = 'border-box';
        image.style.zIndex = 90;

        const sprite = this.getSprite(thing, { name });

        image.src = sprite;

        image.onerror = () => {
            const player = this.players[thing.owner] || {};
            const color = thing.color || player.color;

            image.error = true;
            image.style.border = '1px solid black';
            image.style.width = thing.width * TILE_SIZE + 1;
            image.style.height = thing.height * TILE_SIZE + 1;
            image.style.background = color;
            image.style.top = thing.y * TILE_SIZE + top;
            image.style.left = thing.x * TILE_SIZE + left;
        };

        image.onload = event => {
            const { naturalWidth, naturalHeight } = event.target;
            image.style.border = '1px solid transparent';
            image.style.width = Math.max(
                TILE_SIZE * thing.width + 1,
                (naturalWidth / 32) * TILE_SIZE
            );
            image.style.height = Math.max(
                TILE_SIZE * thing.height + 1,
                (naturalHeight / 32) * TILE_SIZE
            );
            image.style.minWidth = Math.max(
                TILE_SIZE * thing.width + 1,
                (naturalWidth / 32) * TILE_SIZE
            );
            image.style.minHeight = Math.max(
                TILE_SIZE * thing.height + 1,
                (naturalHeight / 32) * TILE_SIZE
            );

            const heightSnap = ((naturalHeight / 32) * TILE_SIZE) % TILE_SIZE;
            const widthSnap = ((naturalWidth / 32) * TILE_SIZE) % TILE_SIZE;

            if (TILE_SIZE >= 32 && thing.class !== TILE) {
                image.style.objectFit = 'none';
            }

            if (naturalHeight > 32 && heightSnap !== 0 && thing.height === 1) {
                image.style.top = thing.y * TILE_SIZE + top - heightSnap / 2;
            } else {
                image.style.top = thing.y * TILE_SIZE + top;
            }
            if (naturalWidth > 32 && widthSnap !== 0 && thing.width === 1) {
                image.style.left = thing.x * TILE_SIZE + left - widthSnap / 2;
            } else {
                image.style.left = thing.x * TILE_SIZE + left;
            }
        };

        image.title = JSON.stringify({ ...thing }, null, 2);

        if (startBuild) {
            image.style.opacity = 0.5;
        }

        thingsContainer.appendChild(image);
    }

    destroyThing(thing) {
        const isSelected = store.isSelected(thing);
        if (isSelected) {
            this.unselectThing(thing);
        }
        const image = getElem(thing.id);
        image.parentNode.removeChild(image);
    }

    updateThings() {
        const thingsContainer = getElem('things');
        const { top, left } = thingsContainer.getBoundingClientRect();

        const things = store.getArray(null, { aggregateType: true });
        things.forEach(thing => {
            const { goal, x, y, id } = thing;
            if (goal && (goal.x !== x || goal.y !== y)) {
                const updatedCoordinates = this.getCloserToGoal(thing, goal);

                let updatedThing = {
                    ...thing,
                    x: updatedCoordinates.x,
                    y: updatedCoordinates.y
                };

                if (updatedCoordinates.reached) {
                    delete updatedThing.goal;

                    if (goal.intent === 'build') {
                        this.handleBuild(updatedThing, goal.target);
                    } else if (goal.intent === 'harvest') {
                        if (goal.target.goldContained > 0) {
                            this.handleHarvest(updatedThing, goal.target);
                            updatedThing = {
                                ...updatedThing,
                                x: undefined,
                                y: undefined
                            };
                        }
                    }
                }

                if (updatedCoordinates.interrupted) {
                    delete updatedThing.goal;
                }

                store.update([updatedThing], { replace: true });

                const image = getElem(id);
                if (image) {
                    image.title = JSON.stringify(updatedThing, null, 2);

                    const { naturalWidth, naturalHeight } = image;
                    const heightSnap =
                        ((naturalHeight / 32) * TILE_SIZE) % TILE_SIZE;
                    const widthSnap =
                        ((naturalWidth / 32) * TILE_SIZE) % TILE_SIZE;

                    if (thing.image && showThingImages) {
                        image.style.width = Math.max(
                            TILE_SIZE * thing.width + 1,
                            (naturalWidth / 32) * TILE_SIZE
                        );
                        image.style.height = Math.max(
                            TILE_SIZE * thing.height + 1,
                            (naturalHeight / 32) * TILE_SIZE
                        );
                        image.style.minWidth = Math.max(
                            TILE_SIZE * thing.width + 1,
                            (naturalWidth / 32) * TILE_SIZE
                        );
                        image.style.minHeight = Math.max(
                            TILE_SIZE * thing.height + 1,
                            (naturalHeight / 32) * TILE_SIZE
                        );
                    } else {
                        image.style.width = thing.width * TILE_SIZE + 1;
                        image.style.height = thing.height * TILE_SIZE + 1;
                    }

                    if (naturalHeight > 32 && heightSnap !== 0) {
                        image.style.top =
                            updatedCoordinates.y * TILE_SIZE +
                            top -
                            heightSnap / 2;
                    } else {
                        image.style.top =
                            updatedCoordinates.y * TILE_SIZE + top;
                    }
                    if (naturalWidth > 32 && widthSnap !== 0) {
                        image.style.left =
                            updatedCoordinates.x * TILE_SIZE +
                            left -
                            widthSnap / 2;
                    } else {
                        image.style.left =
                            updatedCoordinates.x * TILE_SIZE + left;
                    }
                }
            }

            if (thing.timeToBuild > 0) {
                const timeToBuild = instaBuild
                    ? 0
                    : thing.timeToBuild - this.timeDelta;
                const health = instaBuild
                    ? thing.maxHealth
                    : Math.min(
                          thing.maxHealth,
                          Math.floor(
                              thing.maxHealth *
                                  ((timeToBuild / thing.buildTime) * -1 + 1)
                          )
                      );

                const updatedThing = {
                    ...thing,
                    health,
                    timeToBuild
                };

                store.update([updatedThing]);
                const image = getElem(id);
                image.style.opacity =
                    0.5 +
                    (updatedThing.buildTime - updatedThing.timeToBuild) /
                        updatedThing.buildTime /
                        2;

                const isSelected = store.isSelected(updatedThing);
                if (isSelected) {
                    this.updateThingDescription(updatedThing);
                }
            } else if (thing.timeToBuild <= 0) {
                this.handleBuildFinished(thing);
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

        const thingsContainer = getElem('things');
        const { top, left } = thingsContainer.getBoundingClientRect();
        const image = getElem('build-preview');
        image.style.left = preview.x * TILE_SIZE + left;
        image.style.top = preview.y * TILE_SIZE + top;
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
        this.timeDelta = timeDelta;

        let cycleDelay = MAX_FPS;
        if (timeDelta > cycleDelay) {
            cycleDelay = Math.max(1, cycleDelay - (timeDelta - cycleDelay));
        }

        this.showFPS();
        this.lastCycle = now;

        setTimeout(() => this.gameLoop(), cycleDelay);
    }

    /* Debug */

    showFPS() {
        const fps = (1000 / this.timeDelta).toFixed(0);
        const fpsElem = getElem('fps');
        if (fpsElem) {
            fpsElem.innerHTML = fps;
        } else {
            console.log(`fps: ${Number(fps.toFixed(1))}`);
        }
    }
}

export default new Engine();
