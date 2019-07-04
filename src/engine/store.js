import uuid from 'uuid';
import { THING_TYPES, THING_PROPERTIES } from './constants';

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

    getById(id) {
        return this.items[id];
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

    getCollision(source, destination, { right, left, up, down }) {
        const destinationSnappedX =
            Math.floor(destination.x) + (right && source.width);
        const destinationSnappedY =
            Math.floor(destination.y) + (down && source.height);

        const blocked = this.getArray(null, {
            aggregateType: true
        }).some(thing => {
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

            minX = thingArea.minX;
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

        return blocked;
    }

    getSelectionArray({ aggregateThings = false } = {}) {
        let selected = Object.keys(this.selected).map(id => this.selected[id]);

        if (aggregateThings) {
            selected.map(thing => ({
                ...this.items[thing.id]
            }));
        }

        return selected;
    }

    add(things) {
        let thingMap = {};
        things.forEach(thing => {
            let id = uuid();
            thingMap[id] = {
                id,
                ...thing
            };
        });

        this.items = {
            ...this.items,
            ...thingMap
        };
    }

    update(thingsToUpdate, { replace = false } = {}) {
        thingsToUpdate.forEach(thingToUpdate => {
            const thing = this.items[thingToUpdate.id];
            const updatedThing = {
                ...(!replace && { ...thing }),
                ...thingToUpdate
            };

            this.items[thingToUpdate.id] = this.sanitizeThing(updatedThing);
        });
    }

    remove(ids) {
        ids.forEach(id => {
            delete this.items[id];
        });
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

    sanitizeThing(thingWithExtraProperties) {
        let strippedThing = {};
        THING_PROPERTIES.forEach(property => {
            strippedThing[property] = thingWithExtraProperties[property];
        });

        return strippedThing;
    }
}

export default (window.store = new Store());
