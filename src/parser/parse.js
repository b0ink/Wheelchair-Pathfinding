const fs = require("fs");

function RetrieveOSMData() {
    // Paste this in the OSM iD editor developer console to retrieve `OSM-Export.json` data
    // (Assuming ways are selected)

    // Retrieve the IDs of all selected ways
    let ways = window.context.selectedIDs();

    let wayswithnodes = [];

    // Iterate over each way
    for (let way of ways) {
        // Using the way's ID, retrieve array of nodes that make up that way
        let nodes = window.iD.utilGetAllNodes([way], window.context.graph());

        // Iterate over each node, removing unneccesary key/values from the node
        // Leaving only coordinates and names of the node, such as buildings or other points of interest
        for (let node of nodes) {
            delete node.user;
            delete node.uid;
            delete node.changeset;
            delete node.timestamp;
            delete version;
            delete visible;
            delete v;
        }

        // Store the group of nodes
        wayswithnodes.push(nodes);
    }
    console.log(wayswithnodes); // ->  OSM-Export.json
}

var nodes = [];
var paths = [];

function parse() {
    let index = 1;
    const data = require("./OSM-Export.json");
    for (let way of data) {
        for (let i = 0; i < way.length - 1; i++) {

            let coord1 = {
                long: way[i].loc[0],
                lat: way[i].loc[1],
            };

            let coord2 = {
                long: way[i + 1].loc[0],
                lat: way[i + 1].loc[1],
            };

            // If this node doesn'y exist, create a new node, attaching any names found in the node object
            // Also ensuring that there are no duplicate nodes or paths
            let node1 = GetNode(coord1);
            if (node1 == null) {
                node1 = CreateNode(coord1, GetName(way[i]));
            }

            let node2 = GetNode(coord2);
            if (node2 == null) {
                node2 = CreateNode(coord2, GetName(way[i + 1]));
            }

            // If the path between these two nodes doesn't exist, create it
            if (GetPath(coord1, coord2) == null) {
                CreatePath(node1, node2);
            }

            index++;
        }
    }
}

function exportDataToJson() {
    const dataToExport = {
        nodes: nodes,
        paths: paths,
    };

    const jsonData = JSON.stringify(dataToExport, null, 2);

    fs.writeFile("data.json", jsonData, "utf8", (err) => {
        if (err) {
            console.error("Error writing JSON file:", err);
        } else {
            console.log("Data exported to data.json successfully.");
        }
    });
}

parse();
exportDataToJson();

//

function GetName(nodeObj) {
    if (nodeObj != null && nodeObj.tags != null && nodeObj.tags.name != null) {
        return nodeObj.tags.name;
    }
    return "";
}

function CreateNode(coord, name) {
    let node = {
        id: nodes.length + 1,
        coordinate: coord,
        label: name,
    };
    nodes.push(node);
    return node;
}

function CreatePath(node1, node2, cost) {
    let path = {
        nodeID1: node1.id,
        nodeID2: node2.id,
        node1Data: node1,
        node2Data: node2,
        cost: calculateDistance(node1.coordinate, node2.coordinate),
    };
    paths.push(path);
    return path;
}

function GetCoordFromString(sCoordinate) {
    let coord = { long: null, lat: null };
    let text = sCoordinate.split(",");
    coord.lat = parseFloat(text[0]);
    coord.long = parseFloat(text[1]);
    return coord;
}

function GetNode(coord) {
    for (let node of nodes) {
        if (
            node.coordinate.lat == coord.lat &&
            node.coordinate.long == coord.long
        ) {
            return node;
        }
    }
    return null;
}

function GetPath(coord1, coord2) {
    for (let path of paths) {
        if (
            (objectsAreEqual(path.node1Data.coordinate, coord1) &&
                objectsAreEqual(path.node2Data.coordinate, coord2)) ||
            (objectsAreEqual(path.node2Data.coordinate, coord1) &&
                objectsAreEqual(path.node1Data.coordinate, coord2))
        ) {
            console.log("found existing path");
            return path;
        }
    }
    return null;
}

function objectsAreEqual(obj1, obj2) {
    // Get the keys of the objects
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Check if the number of keys is the same
    if (keys1.length !== keys2.length) {
        return false;
    }

    // Check if all keys and values are the same
    for (let key of keys1) {
        if (obj1[key] !== obj2[key]) {
            return false;
        }
    }

    return true;
}
