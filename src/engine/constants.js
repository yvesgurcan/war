export const TILE_SIZE = 32;

export const PLAYER_VIEW_WIDTH = 14;
export const PLAYER_VIEW_HEIGHT = 14;

export const MAX_FPS = 1000 / 30;

export const BUILDING = 'building';
export const UNIT = 'unit';

export const WORLD_CLIMATES = {
    forest: {
        grass: {
            color: 'rgb(20, 90, 10)'
        }
    },
    winter: {
        grass: {
            color: 'rgb(160, 160, 180)'
        }
    },
    wasteland: {
        grass: {
            color: 'rgb(140, 65, 20)'
        }
    },
    swamp: {
        grass: {
            color: 'rgb(70, 45, 30)'
        }
    }
};

export const THING_TYPES = {
    goldmine: {
        displayName: 'Gold Mine',
        class: BUILDING,
        height: 3,
        width: 3,
        color: 'gold'
    },
    townhall: {
        displayName: 'Town Hall',
        class: BUILDING,
        height: 4,
        width: 4,
        buildTime: 255000,
        maxHealth: 1200,
        foodProduction: 1,
        gold: 1000,
        lumber: 600
    },
    farm: {
        displayName: 'Farm',
        class: BUILDING,
        height: 2,
        width: 2,
        buildTime: 100000,
        maxHealth: 400,
        foodProduction: 4,
        gold: 500,
        lumber: 100
    },
    barracks: {
        displayName: 'Barracks',
        class: BUILDING,
        height: 3,
        width: 3,
        buildTime: 200000,
        maxHealth: 800,
        gold: 300,
        lumber: 400,
        oil: 50
    },
    peasant: {
        displayName: 'Peasant',
        class: UNIT,
        builder: true,
        height: 1,
        width: 1,
        speed: 150 / 1000,
        maxHealth: 50,
        food: 1
    },
    catapult: {
        displayName: 'Catapult',
        class: UNIT,
        height: 1,
        width: 1,
        speed: 200 / 1000,
        maxHealth: 120,
        food: 1
    }
};

export const THING_PROPERTIES = [
    'id',
    'type',
    'owner',
    'x',
    'y',
    'goal',
    'health',
    'timeToBuild',
    'thingsHosted'
];

export const BUILDING_NAMES = Object.keys(THING_TYPES).filter(
    key => THING_TYPES[key].class === BUILDING
);

// events
export const NEW_GAME = 'NEW_GAME';
export const INIT_WORLD = 'INIT_WORLD';
