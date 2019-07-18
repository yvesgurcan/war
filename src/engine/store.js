import uuid from 'uuid';
import { THING_TYPES, THING_PROPERTIES, UNIT, BUILDING } from './constants';

let instance = null;

class Store {
    constructor() {
        this.items = {};
        this.selected = {};
        instance = this;
    }

    get instance() {
        return instance;
    }

    /* Get */

    getArray(ids = null, { aggregateType = false } = {}) {
        let things = [];
        if (!ids) {
            things = Object.keys(this.items).map(id => this.items[id]);
        } else {
            things = Object.keys(this.items)
                .map(id => this.items[id])
                .filter(thing => ids.includes(thing.id));
        }

        if (aggregateType) {
            return things.map(thing => ({
                ...thing,
                ...THING_TYPES[thing.type]
            }));
        }

        return things;
    }

    getObject(ids = null) {
        if (!ids) {
            return this.items;
        }
    }

    getById(id, { aggregateType = false } = {}) {
        const thing = this.items[id];

        if (thing && aggregateType) {
            return {
                ...thing,
                ...THING_TYPES[thing.type]
            };
        }

        return thing;
    }

    getAtCoordinates(x, y, { aggregateSelection = false } = {}) {
        const match = this.getArray().find(thing => {
            const thingType = THING_TYPES[thing.type];
            const xMatch = x >= thing.x && x < thing.x + thingType.width;
            const yMatch = y >= thing.y && y < thing.y + thingType.height;
            return xMatch && yMatch;
        });

        if (match && aggregateSelection) {
            return {
                ...match,
                ...this.selected[match.id]
            };
        }

        return match;
    }

    getUnitsByPlayer(playerIndex) {
        return this.getArray(null, { aggregateType: true }).filter(
            thing => thing.class === UNIT && thing.owner === playerIndex
        );
    }

    getBuildingsByPlayer(playerIndex) {
        return this.getArray(null, { aggregateType: true }).filter(
            thing => thing.class === BUILDING && thing.owner === playerIndex
        );
    }

    /* Selection */

    getSelectionArray({ aggregateThings = false, aggregateType = false } = {}) {
        let selected = Object.keys(this.selected).map(id => this.selected[id]);

        if (aggregateThings || aggregateType) {
            return selected.map(thing => {
                const thingDetails = this.items[thing.id];
                let thingTypeDetails = {};
                if (aggregateType) {
                    thingTypeDetails = THING_TYPES[thingDetails.type];
                }

                return {
                    ...thingDetails,
                    ...thingTypeDetails
                };
            });
        }

        return selected;
    }

    isSelected(thing) {
        const selected = store.getSelectionArray();
        return selected.find(selectedThing => selectedThing.id === thing.id);
    }

    select(ids) {
        ids.forEach(id => {
            this.selected[id] = {
                id
            };
        });
    }

    unselect(ids = null) {
        if (!ids) {
            this.selected = {};
            return;
        }

        ids.forEach(id => {
            delete this.selected[id];
        });
    }

    /* Collision */

    getCollision(source, exception = {}) {
        const snappedX = Math.floor(source.x);
        const snappedY = Math.floor(source.y);

        const blocked = this.getArray(null, {
            aggregateType: true
        }).some(thing => {
            if (thing.id === (source.id || exception.id)) {
                return false;
            }
            const thingSnappedX = Math.floor(thing.x);
            const thingSnappedY = Math.floor(thing.y);
            const thingArea = {
                minX: thingSnappedX,
                maxX: thingSnappedX + thing.width - 1,
                minY: thingSnappedY,
                maxY: thingSnappedY + thing.height - 1
            };

            if (
                snappedY + source.height - 1 >= thingArea.minY &&
                snappedY <= thingArea.maxY &&
                snappedX + source.width - 1 >= thingArea.minX &&
                snappedX <= thingArea.maxX
            ) {
                return true;
            }

            return false;
        });

        return blocked;
    }

    getCollisionWhileMoving(source, destination = {}, { right, down } = {}) {
        const destinationSnappedX =
            Math.floor(destination.x || source.x) + (right && source.width);
        const destinationSnappedY =
            Math.floor(destination.y || source.y) + (down && source.height);

        const blocking = this.getArray(null, {
            aggregateType: true
        }).filter(thing => {
            if (thing.id === source.id) {
                return false;
            }
            const thingSnappedX = Math.floor(thing.x);
            const thingSnappedY = Math.floor(thing.y);
            const thingArea = {
                minX: thingSnappedX,
                maxX: thingSnappedX + thing.width - 1,
                minY: thingSnappedY,
                maxY: thingSnappedY + thing.height - 1
            };

            if (
                destinationSnappedY >= thingArea.minY &&
                destinationSnappedY <= thingArea.maxY &&
                destinationSnappedX >= thingArea.minX &&
                destinationSnappedX <= thingArea.maxX
            ) {
                return true;
            }

            return false;
        });

        return blocking ? blocking[0] : false;
    }

    /* Add, Update, Delete */

    add(things) {
        let thingMap = {};
        let ids = [];
        things.forEach(thing => {
            let id = uuid();
            ids.push(id);
            thingMap[id] = this.sanitizeThing({
                id,
                ...thing
            });
        });

        this.items = {
            ...this.items,
            ...thingMap
        };

        return ids;
    }

    update(thingsToUpdate, { replace = false } = {}) {
        thingsToUpdate.forEach(thingToUpdate => {
            const thing = this.items[thingToUpdate.id];

            if (thing) {
                const updatedThing = {
                    ...(!replace && { ...thing }),
                    ...thingToUpdate
                };

                this.items[thingToUpdate.id] = this.sanitizeThing(updatedThing);
            }
        });
    }

    remove(things) {
        things.forEach(thing => {
            delete this.items[thing.id];
        });
    }

    /* Utils */

    sanitizeThing(thingWithExtraProperties) {
        let strippedThing = {};
        THING_PROPERTIES.forEach(property => {
            strippedThing[property] = thingWithExtraProperties[property];
        });

        return strippedThing;
    }
}

export default (window.store = new Store());
