const generateForest = ({ x, y, width, height }) => {
    let wood = [];
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            wood = [
                ...wood,
                {
                    type: 'wood',
                    lumberContained: 100,
                    x: x + i,
                    y: y + j
                }
            ];
        }
    }

    return wood;
};

export default {
    metadata: {
        width: 14,
        height: 14,
        climate: 'forest'
    },
    things: [
        {
            type: 'goldmine',
            goldContained: 100,
            x: 3,
            y: 5
        },
        ...generateForest({ x: 0, y: 0, width: 14, height: 2 }),
        ...generateForest({ x: 0, y: 2, width: 2, height: 1 }),
        ...generateForest({ x: 12, y: 2, width: 2, height: 12 }),
        ...generateForest({ x: 11, y: 2, width: 1, height: 10 }),
        ...generateForest({ x: 10, y: 2, width: 1, height: 8 }),
        ...generateForest({ x: 5, y: 2, width: 5, height: 1 }),
        ...generateForest({ x: 6, y: 3, width: 4, height: 1 }),
        ...generateForest({ x: 7, y: 4, width: 3, height: 1 }),
        ...generateForest({ x: 8, y: 5, width: 2, height: 2 }),
        ...generateForest({ x: 9, y: 7, width: 1, height: 2 }),
        {
            type: 'peasant',
            owner: 0,
            x: 1,
            y: 5
        },
        {
            type: 'peasant',
            owner: 0,
            x: 1,
            y: 6
        },
        {
            type: 'townhall',
            owner: 0,
            x: 2,
            y: 9
        }
    ]
};
