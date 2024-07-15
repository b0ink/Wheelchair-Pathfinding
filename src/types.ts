export interface Coordinate {
    lon: number;
    lat: number;
}

export class Node {
    id: number;
    coordinates: Coordinate;
    neighbors: Node[];

    parent: Node | null;

    constructor(id: number, lon: number, lat: number) {
        this.id = id;
        this.coordinates = { lon, lat };
        this.neighbors = [];
        this.parent = null;
    }
    addNeighbor(neighborNode: Node) {
        if (!this.neighbors.includes(neighborNode)) {
            this.neighbors.push(neighborNode);
        }
    }
}

// Only used for rendering paths
export class Path {
    startNode: Node;
    endNode: Node;
    cost: number;

    constructor(startNode: Node, endNode: Node, cost: number) {
        this.startNode = startNode;
        this.endNode = endNode;
        this.cost = cost;
    }
}

export interface PathfindResult {
    path: Node[];
    nodesTraversed: number;
}

export interface NodeData {
    id: number;
    coordinate: {
        long: number;
        lat: number;
    };
    label: string;
}
