export class MapFeatures {

    constructor() {
        this.rivers = [];
        this.roads = [];
        this.railways = [];
        this.settlements = [];
    }

    addRiver(name, points, options = {}) {
        this.rivers.push({
            name,
            points,
            width: options.width ?? 5
        });
    }

    addRoad(name, points, options = {}) {
        this.roads.push({
            name,
            points,
            importance: options.importance ?? "main"
        });
    }

    addRailway(name, points) {
        this.railways.push({
            name,
            points
        });
    }

    addSettlement(data) {
        this.settlements.push({
            id: data.id,
            name: data.name,
            nameZh: data.nameZh,
            q: data.q,
            r: data.r,
            type: data.type ?? "town"
        });
    }
}
