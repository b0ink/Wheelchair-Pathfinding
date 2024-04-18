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
    CalculateDistance_Manhttan,
    sleep,
} = require("./Utility");

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

// Only used for easy management and rendering paths
class Path {
    constructor(startNode, endNode, cost) {
        this.startNode = startNode;
        this.endNode = endNode;
        this.cost = cost;
    }
}

const heuristics = ["Haversine", "Euclidean", "Manhattan"];
const algorithms = ["astar", "dijkstra", "bfs"];

function App() {
    const [traces, setTraces] = useState([]);
    const [token, setToken] = useState(null);

    const [node1Name, setNode1Name] = useState("");
    const [node2Name, setNode2Name] = useState("");

    const [pathDistance, setPathDistance] = useState(0);
    const [totalNodesTraversed, setTotalNodesTraversed] = useState(0);

    const [heuristicType, setHeuristicType] = useState("Haversine");

    const CalculateDistance = (node1, node2) => {
        if (heuristicType == "Haversine") {
            return CalculateDistance_Haversine(node1, node2);
        } else if (heuristicType == "Euclidean") {
            return CalculateDistance_Euclidean(node1, node2);
        } else if (heuristicType == "Manhattan") {
            return CalculateDistance_Manhttan(node1, node2);
        }

        return CalculateDistance_Haversine(node1, node2);
    };

    const ResetNav = () => {
        setPathDistance(0);
        setNode1Name("");
        setNode2Name("");
        setTotalNodesTraversed(0);
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
        console.log("starting index at", startNodeID);
        // connect node 798 to 354
        GetNodeById(798).addNeighbor(GetNodeById(354));
        GetNodeById(354).addNeighbor(GetNodeById(798));
        // newNode1 += -37.8460620, 145.1136229
        let newNode1 = new Node(805, 145.1136229, -37.846062);

        // connect 601 to newNode1
        GetNodeById(601).addNeighbor(newNode1);
        newNode1.addNeighbor(GetNodeById(601));

        // newNode2 += -37.8461351, 145.1137048
        startNodeID++;
        let newNode2 = new Node(806, 145.1137048, -37.8461351);

        // connect node HF/762 to newNode2
        newNode2.addNeighbor(GetNodeById(762));
        GetNodeById(762).addNeighbor(newNode2);

        // connect newNode1 to newNode2
        newNode1.addNeighbor(newNode2);
        newNode2.addNeighbor(newNode1);

        // connect HE/123 to newNode2
        GetNodeById(123).addNeighbor(newNode2);
        newNode2.addNeighbor(GetNodeById(123));
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
        let node1 = GetNodeById(92); // Building G
        let node2 = GetNodeById(361); // Hungry jacks

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

        alert("Check the developer console for results");

        console.log(
            "A* :: Nodes Traversed:",
            astarResult.nodesTraversed,
            "Distance:",
            aStarDistance
        );
        console.log(
            "Dijkstra :: Nodes Traversed:",
            dijkstraResult.nodesTraversed,
            "Distance:",
            dijkstraDistance
        );
        console.log(
            "Breadth-First Search:: Nodes Traversed:",
            bfsResult.nodesTraversed,
            "Distance:",
            bfsDistance
        );
    }

    async function AStar(startNode, endNode, debug=false) {
        let openSet = [startNode];
        let closedSet = [];
        let gScore = {}; // Map to store the cost from start along best known path
        let fScore = {}; // Map to store the estimated total cost from start to goal through a node

        gScore[startNode] = 0;
        fScore[startNode] = CalculateDistance(startNode, endNode);

        let count1 = 0;
        let count2 = 0;

        let notGoodEnoughNodes = [];
        while (openSet.length > 0) {
            count1++;
            if(!debug) await sleep(1);
            setTotalNodesTraversed(count1);

            let current = openSet.reduce((minNode, node) =>
                fScore[node] < fScore[minNode] ? node : minNode
            );

            if (current === endNode) {
                console.log("count1", count1);
                console.log("count2", count2);
                return {
                    path: reconstructPath(endNode),
                    nodesTraversed: count1,
                };
            }

            openSet = openSet.filter((node) => node !== current);
            closedSet.push(current);

            // AddNewPath(current, node, "orange", "test");

            for (let neighbor of current.neighbors) {
                count2++;
                if (closedSet.includes(neighbor)) {
                    continue;
                }

                count1++;

                // f = g(node) + h(node)
                let tentativeGScore =
                    gScore[current] + CalculateDistance(current, neighbor);

                // AddNewPath(current, neighbor, "orange", tentativeGScore.toString());
                // await sleep();

                if (
                    !openSet.includes(neighbor) ||
                    tentativeGScore < gScore[neighbor]
                ) {
                    // if(neighbor.parent ){
                    // }else{
                    // }

                    neighbor.parent = current;

                    gScore[neighbor] = tentativeGScore;
                    fScore[neighbor] =
                        gScore[neighbor] + CalculateDistance(neighbor, endNode);

                    if (!openSet.includes(neighbor)) {
                        // AddNewPath(current, neighbor, "green", "s");
                        openSet.push(neighbor);
                    } else {
                        // AddNewPath(current, neighbor, "orange", tentativeGScore.toString());
                    }
                } else {
                }
            }
        }
        return null; // No path found
    }

    async function dijkstra(startNode, endNode, debug=false) {
        // Initialize distances to all nodes as infinity except for the start node
        let distances = {};
        let previousNodes = {};
        gNodes.forEach((node) => {
            distances[node.id] = node === startNode ? 0 : Infinity;
            previousNodes[node.id] = null;
        });

        console.log(distances);

        let count1NodesTrav = 0;
        let count2 = 0;
        // Main loop
        const unvisitedNodes = [...gNodes];
        while (unvisitedNodes.length > 0) {
            // Find the node with the smallest distance from start among unvisited nodes
            const currentNode = unvisitedNodes.reduce((minNode, node) =>
                distances[node.id] < distances[minNode.id] ? node : minNode
            );

            count1NodesTrav++;

            setTotalNodesTraversed(count1NodesTrav);
            if(!debug) await sleep(1);

            if (currentNode === endNode) {
                console.log(distances);
                return {
                    path: reconstructPathDijkstra(endNode, previousNodes),
                    nodesTraversed: count1NodesTrav,
                };
            }

            // Remove the current node from unvisited nodes
            unvisitedNodes.splice(unvisitedNodes.indexOf(currentNode), 1);

            // Update distances to neighbors
            currentNode.neighbors.forEach((neighbor) => {
                count1NodesTrav++;

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
        RenderFinalPath(path);
        return path;
    }

    async function breadthFirstSearch(startNode, endNode, debug=false) {
        const queue = [startNode];
        const visited = new Set();
        const previousNodes = {};

        let countNodesTraversed = 0;
        while (queue.length > 0) {
            const currentNode = queue.shift();
            countNodesTraversed++;
            if(!debug) await sleep(1);
            setTotalNodesTraversed(countNodesTraversed);

            if (currentNode === endNode) {
                return {
                    path: reconstructPathBFS(startNode, endNode, previousNodes),
                    nodesTraversed: countNodesTraversed,
                };
            }

            visited.add(currentNode);

            for (const neighbor of currentNode.neighbors) {
                countNodesTraversed++;
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
        RenderFinalPath(path);
        return path;
    }

    // Function to reconstruct the path from start to end
    function reconstructPath(currentNode) {
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

    async function RenderFinalPath(path) {
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
                    color: "fuchsia",
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
            await sleep(50);

            // Plotly.addTrace('plot', newTrace)
        }
    }

    function AddNewPath(node1, node2, color = "red", label = "") {
        console.log(node1);
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

        // let newTraces = [];
        // for(let oldtrace of traces){
        // newTraces.push(oldtrace)
        // }
        // newTraces.push(newTrace);
        // console.log(traces)
        // traces.dataValues.push(newTrace);
        traces.push(newTrace);
        setTraces([...traces]);
        console.log("adding new trace");
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
        const response = await fetch("/data.json");
        const data = await response.json();

        const nodes = data.nodes;
        const paths = data.paths;

        gNodes = [];
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
        const edgeTraces = paths.map((path) => ({
            type: "scattermapbox",
            mode: "lines",
            lon: [
                path.node1Data.coordinate.long,
                path.node2Data.coordinate.long,
            ],
            lat: [path.node1Data.coordinate.lat, path.node2Data.coordinate.lat],
            line: {
                width: 2,
                color: "black",
            },
        }));

        // setTraces([...nodeTraces, ...edgeTraces]);
        setTraces([...nodeTraces]);

        setToken(true);
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
        console.log(layout);
        console.log(e.points[0]);
        console.log(traces);

        let index = e.points[0].fullData.index;
        if (e.points[0].data.mode !== "markers") {
            console.log("not a marker");
            return;
        }

        ResetTraces(true, index);

        const point = e.points[0];
        console.log(point.lat, point.lon);
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
                console.log(
                    "pathfinding betweem",
                    node1Selection,
                    node2Selection
                );
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
        console.log(startNode, endNode);
        if (algoType == "astar") {
            console.log("running a star");
            const path = AStar(startNode, endNode);
        } else if (algoType == "dijkstra") {
            console.log("running dijkstra");
            const path = dijkstra(startNode, endNode);
        } else if (algoType == "bfs") {
            const path = breadthFirstSearch(startNode, endNode);
        }
        return; // todo

        console.log(path);
        if (!path) return;
        console.log("updating route colros?");
    }
    function GetNodeByCoord(lat, lon) {
        console.log(gNodes);
        for (let node of gNodes) {
            if (node.coordinates.lat == lat && node.coordinates.lon == lon) {
                return node;
            }
        }
        return null;
    }

    const onMouseMove = (e) => {
        console.log(e);
    };

    return (
        <div className="App">
            <div class="stats">
                <div id="stats_nodes">
                    <div id="node1">
                        <span>Node 1: </span>
                        {node1Name ?? "N/A"}
                    </div>
                    <div id="node2">
                        <span>Node 2: </span>
                        {node2Name}
                    </div>
                </div>
                {/* <div width="100px"></div> */}
                <div id="stats_distance">
                    <div>Distance: {pathDistance.toFixed(2)}m</div>
                    <div>
                        Est. Travel Time: {(pathDistance / 70).toFixed(0)}{" "}
                        Minutes
                    </div>
                    <div>Nodes Traversed: {totalNodesTraversed}</div>
                </div>
            </div>
            <div class="stats selectors">
                <div>
                    <label for="heuristic_selector">Heuristic type</label>
                    <br></br>
                    <select
                        id="hueristic_selector"
                        onChange={onHeuristicChange}
                    >
                        <option value="Haversine" selected>
                            Haversine
                        </option>
                        <option value="Euclidean">Euclidean</option>
                        <option value="Manhattan">Manhattan</option>
                    </select>
                </div>
                <button onClick={runTests}>Run Tests</button>
                <div>
                    <label for="algorithm_type">Algorithm type</label>
                    <br></br>
                    <select id="algorithm_type" onChange={onAlgorithmChange}>
                        <option value="astar" selected>
                            A*
                        </option>
                        <option value="dijkstra">Dijkstra's</option>
                        <option value="bfs">Breadth First Search</option>
                    </select>
                </div>
            </div>

            <Plot
                id="graph"
                data={traces}
                layout={layout}
                onUpdate={(figure) => setLayout(figure.layout)}
                // onInitialized={(figure) => setFigure(figure)}
                revision={revision}
                onClick={onClick}
            />
        </div>
    );
}

export default App;
