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
        class: BUILDING,
        height: 4,
        width: 4
    },
    farm: {
        class: BUILDING,
        height: 2,
        width: 2
    },
    peasant: {
        class: UNIT,
        height: 1,
        width: 1,
        speed: 150 / 1000
    }
};

export const RIGHT_CLICK = 3;
