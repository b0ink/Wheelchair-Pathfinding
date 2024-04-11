class Node {
    constructor(id, lon, lat) {
        this.id = id;
        this.coordinates = { lon, lat };
        this.neighbors = [];
    }
    addNeighbor(neighborNode) {
        this.neighbors.push(neighborNode);
    }
}

class Path {
    constructor(startNode, endNode, cost) {
        this.startNode = startNode;
        this.endNode = endNode;
        this.cost = cost;
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function AStar(startNode, endNode) {
    let openSet = [startNode];
    let closedSet = [];
    let gScore = {}; // Map to store the cost from start along best known path
    let fScore = {}; // Map to store the estimated total cost from start to goal through a node

    gScore[startNode] = 0;
    fScore[startNode] = calculateDistance(startNode, endNode);

    let count1 = 0;
    let count2 = 0;

    while (openSet.length > 0) {
        count1++;


        let current = openSet.reduce((minNode, node) =>
            fScore[node] < fScore[minNode] ? node : minNode
        );

        if (current === endNode) {
            return reconstructPath(endNode);
        }

        openSet = openSet.filter((node) => node !== current);
        closedSet.push(current);


        for (let neighbor of current.neighbors) {
            count2++;
            
            if (closedSet.includes(neighbor)) {
                continue;
            }

            let tentativeGScore = gScore[current] + calculateDistance(current, neighbor);

            if (!openSet.includes(neighbor) || tentativeGScore < gScore[neighbor]) {
                neighbor.parent = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] = gScore[neighbor] + calculateDistance(neighbor, endNode);

                if (!openSet.includes(neighbor)) {
                    AddNewPath(current, neighbor, "green", "s");
                    openSet.push(neighbor);
                }
            }
        }
    }

    return null; // No path found
}

// Function to reconstruct the path from start to end
function reconstructPath(currentNode) {
    const path = [currentNode];
    while (currentNode.parent) {
        path.unshift(currentNode.parent);
        currentNode = currentNode.parent;
    }
    console.log(path);
    RenderFinalPath(path);
    return path;
}