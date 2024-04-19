import logo from "./logo.svg";
import "./App.css";
import Plot from "react-plotly.js";
import { useEffect, useState, useMemo } from "react";

let gNodes = [];
let gPaths = [];
let node1Selection = null;
let node2Selection = null;

const {
    GetPlotlyLayout,
    CalculateDistance_Haversine,
    CalculateDistance_Euclidean,
    CalculateDistance_Manhattan,
    CalculateDistance_Diagonal,
    sleep,
} = require("./Utility");

class Node {
    constructor(id, lon, lat) {
        this.id = id;
        this.coordinates = { lon, lat };
        this.neighbors = [];
    }
    addNeighbor(neighborNode) {
        if (!this.neighbors.includes(neighborNode)) {
            this.neighbors.push(neighborNode);
        }
    }
}

// Only used for rendering paths
class Path {
    constructor(startNode, endNode, cost) {
        this.startNode = startNode;
        this.endNode = endNode;
        this.cost = cost;
    }
}

const heuristics = ["Haversine", "Euclidean", "Manhattan", "Diagonal"];
const algorithms = ["astar", "dijkstra", "bfs"];

function App() {
    const queryParams = new URLSearchParams(window.location.search);
    const loadAllTraces = queryParams.get("loadAllTraces");

    const [traces, setTraces] = useState([]);
    const [token, setToken] = useState(null);

    const [node1Name, setNode1Name] = useState("");
    const [node2Name, setNode2Name] = useState("");

    const [pathDistance, setPathDistance] = useState(0);
    const [pathNodeCount, setPathNodeCount] = useState(0);

    const [totalNodesTraversed, setTotalNodesTraversed] = useState(0);

    const [heuristicType, setHeuristicType] = useState("Haversine");

    const CalculateDistance = (node1, node2) => {
        if (heuristicType == "Haversine") {
            return CalculateDistance_Haversine(node1, node2);
        } else if (heuristicType == "Euclidean") {
            return CalculateDistance_Euclidean(node1, node2);
        } else if (heuristicType == "Manhattan") {
            return CalculateDistance_Manhattan(node1, node2);
        } else if (heuristicType == "Diagonal") {
            return CalculateDistance_Diagonal(node1, node2);
        }

        return CalculateDistance_Haversine(node1, node2);
    };

    /*
        --------------------------------------------------------
        -- A STAR
        --------------------------------------------------------
    */

    async function AStar(startNode, endNode, debug = false) {
        for (let node of gNodes) {
            if (node.parent) {
                node.parent = null;
            }
        }

        let openSet = [startNode];
        let closedSet = [];
        let gScore = {}; // Map to store the cost from start along best known path
        let fScore = {}; // Map to store the estimated total cost from start to goal through a node

        gScore[startNode] = 0;
        fScore[startNode] = CalculateDistance(
            startNode.coordinates,
            endNode.coordinates
        );

        let aStarNodesTraversed = 0;

        while (openSet.length > 0) {
            aStarNodesTraversed++;

            if (!debug) await sleep(1);
            setTotalNodesTraversed(aStarNodesTraversed);

            let current = openSet.reduce((minNode, node) =>
                fScore[node] < fScore[minNode] ? node : minNode
            );

            if (current === endNode) {
                return {
                    path: reconstructPathAStar(endNode),
                    nodesTraversed: aStarNodesTraversed,
                };
            }

            openSet = openSet.filter((node) => node !== current);
            closedSet.push(current);

            for (let neighbor of current.neighbors) {
                if (closedSet.includes(neighbor)) {
                    continue;
                }

                aStarNodesTraversed++;

                let dist = CalculateDistance(
                    current.coordinates,
                    neighbor.coordinates
                );
                let tentativeGScore = gScore[current] + dist;

                if (
                    !openSet.includes(neighbor) ||
                    tentativeGScore < gScore[neighbor]
                ) {
                    neighbor.parent = current;

                    gScore[neighbor] = tentativeGScore;
                    fScore[neighbor] =
                        gScore[neighbor] +
                        CalculateDistance(
                            neighbor.coordinates,
                            endNode.coordinates
                        );

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        return null; // No path found
    }

    // Function to reconstruct the path from start to end
    function reconstructPathAStar(currentNode) {
        let count = 0;
        const path = [currentNode];
        while (currentNode.parent) {
            path.unshift(currentNode.parent);
            currentNode = currentNode.parent;
            count++;
        }
        console.log(path);
        RenderFinalPath(path);
        return path;
    }


    /*
        --------------------------------------------------------
        -- Dijkstra
        --------------------------------------------------------
    */

    async function dijkstra(startNode, endNode, debug = false) {
        // Initialize distances to all nodes as infinity except for the start node
        let distances = {};
        let previousNodes = {};
        gNodes.forEach((node) => {
            distances[node.id] = node === startNode ? 0 : Infinity;
            previousNodes[node.id] = null;
        });

        let dijkstraNodesTraversed = 0;

        const unvisitedNodes = [...gNodes];
        while (unvisitedNodes.length > 0) {
            // Find the node with the smallest distance from start among unvisited nodes
            const currentNode = unvisitedNodes.reduce((minNode, node) =>
                distances[node.id] < distances[minNode.id] ? node : minNode
            );

            dijkstraNodesTraversed++;

            setTotalNodesTraversed(dijkstraNodesTraversed);
            if (!debug) await sleep(1);

            if (currentNode === endNode) {
                return {
                    path: reconstructPathDijkstra(endNode, previousNodes),
                    nodesTraversed: dijkstraNodesTraversed,
                };
            }

            // Remove the current node from unvisited nodes
            unvisitedNodes.splice(unvisitedNodes.indexOf(currentNode), 1);

            // Update distances to neighbors
            currentNode.neighbors.forEach((neighbor) => {
                dijkstraNodesTraversed++;

                const dist = CalculateDistance(
                    currentNode.coordinates,
                    neighbor.coordinates
                );

                const distanceToNeighbor = distances[currentNode.id] + dist;
                if (distanceToNeighbor < distances[neighbor.id]) {
                    distances[neighbor.id] = distanceToNeighbor;
                    previousNodes[neighbor.id] = currentNode; // Update previous node for neighbor
                }
            });
        }

        return null; // No path found
    }

    function reconstructPathDijkstra(endNode, previousNodes) {
        const path = [];
        let currentNode = endNode;
        while (currentNode) {
            path.unshift(currentNode);
            currentNode = previousNodes[currentNode.id];
        }
        RenderFinalPath(path, "#2de000");
        return path;
    }



    /*
        --------------------------------------------------------
        -- Breadth-First Search
        --------------------------------------------------------
    */

    async function breadthFirstSearch(startNode, endNode, debug = false) {
        const queue = [startNode];
        const visited = new Set();
        const previousNodes = {};

        let bfsNodesTraversed = 0;

        while (queue.length > 0) {
            bfsNodesTraversed++;
            if (!debug) await sleep(1);
            setTotalNodesTraversed(bfsNodesTraversed);

            const currentNode = queue.shift();

            if (currentNode === endNode) {
                return {
                    path: reconstructPathBFS(startNode, endNode, previousNodes),
                    nodesTraversed: bfsNodesTraversed,
                };
            }

            visited.add(currentNode);

            for (const neighbor of currentNode.neighbors) {
                bfsNodesTraversed++;
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                    previousNodes[neighbor.id] = currentNode;
                }
            }
        }

        return null;
    }

    // Reconstruct the shortest path from start node to end node
    function reconstructPathBFS(startNode, endNode, previousNodes) {
        const path = [];
        let currentNode = endNode;
        while (currentNode !== startNode) {
            path.unshift(currentNode);
            currentNode = previousNodes[currentNode.id];
        }
        path.unshift(startNode);
        RenderFinalPath(path, "red");
        return path;
    }


    // UTIL

    const ResetNav = () => {
        setPathDistance(0);
        setNode1Name("");
        setNode2Name("");
        setTotalNodesTraversed(0);
        setPathNodeCount(0);
        node1Selection = null;
        node2Selection = null;
    };

    const onHeuristicChange = (e) => {
        e.preventDefault();
        let type = e.target.value;
        if (!heuristics.includes(type)) {
            type = "Euclidean";
        }
        setHeuristicType(type);
        ResetTraces(true);
        ResetNav();
    };

    const [algoType, setAlgoType] = useState("astar");

    const onAlgorithmChange = (e) => {
        e.preventDefault();
        let type = e.target.value;
        if (!algorithms.includes(type)) {
            type = "astar";
        }
        setAlgoType(type);
        ResetTraces(true);
        ResetNav();
    };

    function HotFixMissingPaths(startNodeID) {
        // connect node 798 to 354
        GetNodeById(798).addNeighbor(GetNodeById(354));
        GetNodeById(354).addNeighbor(GetNodeById(798));
        gPaths.push(new Path(GetNodeById(354), GetNodeById(798), -1));

        // newNode1 += -37.8460620, 145.1136229

        let newNode1 = GetNodeByCoord(-37.846062, 145.1136229);
        if (newNode1 == null) {
            newNode1 = new Node(802, 145.1136229, -37.846062);
        }

        // connect 601 to newNode1
        GetNodeById(601).addNeighbor(newNode1);
        newNode1.addNeighbor(GetNodeById(601));
        gPaths.push(new Path(newNode1, GetNodeById(601), -1));

        // newNode2 += -37.8461351, 145.1137048
        startNodeID++;
        let newNode2 = GetNodeByCoord(-37.8461351, 145.1137048);
        if (newNode2 == null) {
            newNode2 = new Node(805, 145.1137048, -37.8461351);
        }

        // connect node HF/762 to newNode2
        newNode2.addNeighbor(GetNodeById(762));
        GetNodeById(762).addNeighbor(newNode2);
        gPaths.push(new Path(newNode2, GetNodeById(762), -1));

        // connect newNode1 to newNode2
        newNode1.addNeighbor(newNode2);
        newNode2.addNeighbor(newNode1);
        gPaths.push(new Path(newNode2, newNode1, -1));


        // connect HE/123 to newNode2
        GetNodeById(123).addNeighbor(newNode2);
        newNode2.addNeighbor(GetNodeById(123));
        gPaths.push(new Path(newNode2, GetNodeById(123), -1));


        // connect path near ground floor bus stop area
        GetNodeById(406).addNeighbor(GetNodeById(401));
        GetNodeById(401).addNeighbor(GetNodeById(406));
        gPaths.push(new Path( GetNodeById(401), GetNodeById(406), -1));


        return [newNode1, newNode2];
    }

    const calculatePathCost = (path) => {
        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            let node1 = {
                lat: path[i].coordinates.lat,
                lon: path[i].coordinates.lon,
            };
            let node2 = {
                lat: path[i + 1].coordinates.lat,
                lon: path[i + 1].coordinates.lon,
            };
            distance += CalculateDistance_Haversine(node1, node2);
        }

        return distance;
    };

    async function runTests(e) {
        e.preventDefault();

        if (
            !confirm(
                "This runs A-Star, Dijkstra's, and Breadth First Search algorithms from Building G -> Hungry Jacks.\n\nPress ok to continue."
            )
        ) {
            return;
        }

        let node1 = GetNodeById(92); // Building G
        let node2 = GetNodeById(361); // Hungry jacks

        ResetNav();
        // TODO: render final path in different colors
        const astarResult = await AStar(node1, node2, true);
        ResetNav();
        const dijkstraResult = await dijkstra(node1, node2, true);
        ResetNav();
        const bfsResult = await breadthFirstSearch(node1, node2, true);
        ResetNav();

        const aStarDistance = calculatePathCost(astarResult.path);
        const dijkstraDistance = calculatePathCost(dijkstraResult.path);
        const bfsDistance = calculatePathCost(bfsResult.path);

        let output = "";
        output += `A-Star:\nNodes Traversed: ${
            astarResult.nodesTraversed
        }. Total Route Distance: ${aStarDistance.toFixed(2)}m\n\n`;
        output += `Dijkstra:\nNodes Traversed: ${
            dijkstraResult.nodesTraversed
        }. Total Route Distance: ${dijkstraDistance.toFixed(2)}m\n\n`;
        output += `Breadth-First Search:\nNodes Traversed: ${
            bfsResult.nodesTraversed
        }. Total Route Distance: ${bfsDistance.toFixed(2)}m\n\n`;
        console.log(output);

        alert(output);
        alert("Results can also be found in the developer console.");
    }

    async function RenderFinalPath(path, color="fuchsia") {
        let distance = 0;
        let routes = [];
        for (let i = 0; i < path.length - 1; i++) {
            let newTrace = {
                type: "scattermapbox",
                mode: "lines",
                lon: [path[i].coordinates.lon, path[i + 1].coordinates.lon],
                lat: [path[i].coordinates.lat, path[i + 1].coordinates.lat],
                line: {
                    width: 4,
                    color,
                },
            };

            traces.push(newTrace);
            setTraces([...traces]);
            let node1 = {
                lat: path[i].coordinates.lat,
                lon: path[i].coordinates.lon,
            };
            let node2 = {
                lat: path[i + 1].coordinates.lat,
                lon: path[i + 1].coordinates.lon,
            };
            distance += CalculateDistance_Haversine(node1, node2);
            setPathDistance(distance);
            setPathNodeCount(path.length);
            await sleep(50);

            // Plotly.addTrace('plot', newTrace)
        }
    }

    function AddNewPath(node1, node2, color = "red", label = "") {
        let newTrace = {
            type: "scattermapbox",
            mode: "lines",
            lon: [node1.coordinates.lon, node2.coordinates.lon],
            lat: [node1.coordinates.lat, node2.coordinates.lat],
            line: {
                width: 2,
                color: color,
            },
            name: label,
            showLegend: false,
        };

        traces.push(newTrace);
        setTraces([...traces]);
        return newTrace;
    }

    // const layout = {
    const [layout, setLayout] = useState(GetPlotlyLayout(window));

    function GetNodeById(id) {
        for (let node of gNodes) {
            if (node.id == id) {
                return node;
            }
        }
        return null;
    }

    var nodeTraces;
    const [revision, setRevision] = useState(0);

    const getData = async () => {
        // const response = await fetch("/data.json");
        // const data = await response.json();
        const data = require("./data.json");
        const nodes = data.nodes;
        const paths = data.paths;

        gNodes = [];
        gPaths = [];
        for (let node of nodes) {
            gNodes.push(
                new Node(node.id, node.coordinate.long, node.coordinate.lat)
            );
        }

        for (let path of paths) {
            let node1 = GetNodeById(path.nodeID1);
            let node2 = GetNodeById(path.nodeID2);
            if (!node1.neighbors.includes(node2)) {
                node1.addNeighbor(node2);
            }
            if (!node2.neighbors.includes(node1)) {
                node2.addNeighbor(node1);
            }
            // console.log(node1, node2, path.cost);
            let newPath = new Path(node1, node2, path.cost);
            gPaths.push(newPath);
        }

        let hotfix = HotFixMissingPaths();
        gNodes.push(...hotfix);

        const labeledNodes = nodes.filter((node) => node.label.trim() !== "");
        // const labeledNodes = nodes;

        nodeTraces = labeledNodes.map((node) => ({
            type: "scattermapbox",
            mode: "markers",
            lon: [node.coordinate.long],
            lat: [node.coordinate.lat],
            marker: {
                size: 15,
                color: "blue",
            },
            text: node.label,
            name: node.label, // Set the name to the node label
        }));

        // Create traces for paths
        const edgeTraces = gPaths.map((path) => ({
            type: "scattermapbox",
            mode: "lines",
            lon: [
                path.startNode.coordinates.lon,
                path.endNode.coordinates.lon,
            ],
            lat: [path.startNode.coordinates.lat, path.endNode.coordinates.lat],
            line: {
                width: 2,
                color: "black",
            },
        }));

        const timeDiff = (Date.now() - loadAllTraces) / 1000;
        if (loadAllTraces && timeDiff < 3 && timeDiff > 0) {
            // Prevent all traces being rendered on every reload if ?loadAllTraces is still present
            setTraces([...nodeTraces, ...edgeTraces]);
        } else {
            // only render labelled nodes
            setTraces([...nodeTraces]);
        }

        setToken(true);
    };

    const renderAllTraces = (e) => {
        e.preventDefault();
        if (
            !confirm(
                "Are you sure you want to render all 800+ traces?\n\nThis may 1-2 minutes to load and is not recommended on slow devices"
            )
        ) {
            return;
        }
        window.location.href =
            window.origin +
            "/Wheelchair-Pathfinding?loadAllTraces=" +
            Date.now();
    };

    useEffect(() => {
        if (token == null) {
            getData();

            window.addEventListener("resize", (e) => {
                setLayout(GetPlotlyLayout(window));
            });
        }
    }, [token]);

    const ResetTraces = (saveTraces = false, selectedNodeIndex = -1) => {
        let newTraces = [];
        for (let trace of traces) {
            if (trace.mode !== "lines") {
                newTraces.push(trace);
            }
        }

        for (let i = 0; i < newTraces.length; i++) {
            if (newTraces[i].mode == "markers") {
                if (i == selectedNodeIndex) {
                    newTraces[i].marker.color = "red";
                } else {
                    newTraces[i].marker.color = "blue";
                }
            }
        }

        if (saveTraces) {
            setTraces([...newTraces]);
        }

        return newTraces;
    };

    const onClick = (e) => {
        let index = e.points[0].fullData.index;
        if (e.points[0].data.mode !== "markers") {
            console.log("not a marker");
            return;
        }

        ResetTraces(true, index);

        const point = e.points[0];
        if (node1Selection === null) {
            node1Selection = GetNodeByCoord(point.lat, point.lon);
            setNode1Name(point.fullData.name);
            setNode2Name("");
        } else if (node2Selection === null) {
            node2Selection = GetNodeByCoord(point.lat, point.lon);
            setNode2Name(point.fullData.name);

            //! clear previous AStar node.parent assigning
            for (let node of gNodes) {
                if (node.parent) {
                    node.parent = null;
                }
            }

            if (node2Selection != null) {
                DoPathFind(node1Selection, node2Selection);
            }
            node1Selection = null;
            node2Selection = null;
        } else {
            //TODO: disable clicking if mid-path find
            setNode1Name("");
            setNode2Name("");
            node1Selection = null;
            node2Selection = null;
        }
    };

    function DoPathFind(startNode, endNode) {
        // const startNode = GetNodeById(148); // Library
        // const endNode = GetNodeById(786); // OVAL
        if (algoType == "astar") {
            console.log("running a star");
            const path = AStar(startNode, endNode);
        } else if (algoType == "dijkstra") {
            console.log("running dijkstra");
            const path = dijkstra(startNode, endNode);
        } else if (algoType == "bfs") {
            const path = breadthFirstSearch(startNode, endNode);
        }
    }

    function GetNodeByCoord(lat, lon) {
        for (let node of gNodes) {
            if (node.coordinates.lat == lat && node.coordinates.lon == lon) {
                return node;
            }
        }
        return null;
    }

    return (
        <div className="App">
            <div className="stats">
                <div id="stats_nodes">
                    <div id="node1">
                        <span>Node 1: </span>
                        {node1Name ? node1Name : "(none selected)"}
                    </div>
                    <div id="node2">
                        <span>Node 2: </span>
                        {node2Name ? node2Name : "(none selected)"}
                    </div>
                </div>
                <div id="stats_distance">
                    <div>
                        Distance: {pathDistance.toFixed(2)}m{" "}
                        <span id="totalnodes">({pathNodeCount} nodes)</span>
                    </div>
                    <div title="Based on wheelchair speeds at 4.5km/h">
                        Est. Travel Time: {(pathDistance / 75).toFixed(0)}{" "}
                        Minutes
                    </div>
                    <div>Nodes Traversed: {totalNodesTraversed}</div>
                </div>
            </div>
            <div className="stats selectors">
                <div>
                    <label htmlFor="heuristic_selector">Heuristic type</label>
                    <br></br>
                    <select
                        id="hueristic_selector"
                        onChange={onHeuristicChange}
                    >
                        <option value="Haversine">Haversine</option>
                        <option value="Euclidean">Euclidean</option>
                        <option value="Manhattan">Manhattan</option>
                        <option value="Diagonal">Diagonal</option>
                    </select>
                </div>
                <button onClick={runTests}>Run Tests</button>
                <button onClick={renderAllTraces}>Render all paths</button>
                <div>
                    <label htmlFor="algorithm_type">Algorithm type</label>
                    <br></br>
                    <select id="algorithm_type" onChange={onAlgorithmChange}>
                        <option value="astar">A*</option>
                        <option value="dijkstra">Dijkstra's</option>
                        <option value="bfs">Breadth First Search</option>
                    </select>
                </div>
            </div>
            <div className="stats tooltip">
                <span>
                    Click on two individual nodes to determine the best route
                    based on the selected algorithm
                </span>
            </div>

            <Plot
                id="graph"
                data={traces}
                layout={layout}
                onUpdate={(figure) => setLayout(figure.layout)}
                revision={revision}
                onClick={onClick}
            />
        </div>
    );
}

export default App;
