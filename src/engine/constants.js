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
    townhall: {
        displayName: 'Town Hall',
        class: BUILDING,
        height: 4,
        width: 4,
        buildTime: 1000,
        maxHealth: 4000
    },
    farm: {
        displayName: 'Farm',
        class: BUILDING,
        height: 2,
        width: 2,
        buildTime: 1000,
        maxHealth: 100
    },
    barracks: {
        displayName: 'Barracks',
        class: BUILDING,
        height: 3,
        width: 3,
        buildTime: 1000,
        maxHealth: 700
    },
    peasant: {
        displayName: 'Peasant',
        class: UNIT,
        builder: true,
        height: 1,
        width: 1,
        speed: 150 / 1000,
        maxHealth: 50
    },
    catapult: {
        displayName: 'Catapult',
        class: UNIT,
        height: 1,
        width: 1,
        speed: 200 / 1000,
        maxHealth: 120
    }
};

export const THING_PROPERTIES = [
    'id',
    'type',
    'owner',
    'x',
    'y',
    'goal',
    'health'
];

export const BUILDING_NAMES = Object.keys(THING_TYPES).filter(
    key => THING_TYPES[key].class === BUILDING
);
