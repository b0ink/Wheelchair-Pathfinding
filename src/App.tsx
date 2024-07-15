// import logo from "./logo.svg";
import React from "react";

import "./App.css";
import Plot from "react-plotly.js";
import Plotly from "plotly.js"
import { useEffect, useState, useMemo } from "react";


import {Coordinate, Node, NodeData, Path, PathfindResult} from './types';

let gNodes:Node[] = [];
let gPaths = [];
let node1Selection:Node | null = null;
let node2Selection:Node | null = null;

const {
    GetPlotlyLayout,
    CalculateDistance_Haversine,
    CalculateDistance_Euclidean,
    CalculateDistance_Manhattan,
    CalculateDistance_Diagonal,
    sleep,
} = require("./Utility");





const heuristics = ["Haversine", "Euclidean", "Manhattan", "Diagonal"];
const algorithms = ["astar", "dijkstra", "bfs"];

function App() {
    const queryParams = new URLSearchParams(window.location.search);
    const loadAllTraces :number = parseInt(queryParams.get("loadAllTraces") || "");

    const [traces, setTraces] = useState<any>([]);
    const [token, setToken] = useState<boolean | null>(null);

    const [node1Name, setNode1Name] = useState("");
    const [node2Name, setNode2Name] = useState("");

    const [pathDistance, setPathDistance] = useState(0);
    const [pathNodeCount, setPathNodeCount] = useState(0);

    const [totalNodesTraversed, setTotalNodesTraversed] = useState(0);

    const [heuristicType, setHeuristicType] = useState("Haversine");

    const CalculateDistance = (node1:Node, node2:Node) => {
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

    async function AStar(startNode:Node, endNode:Node, debug = false) : Promise<PathfindResult | null>
    {
        for (let node of gNodes) {
            if (node.parent) {
                node.parent = null;
            }
        }

        let openSet:Node[] = [startNode];
        let closedSet:Node[] = [];

        // let messageIdReference: { [key: string]: number } = {};

        let gScore: {[key: number]: number} = {}; // Map to store the cost from start along best known path
        let fScore:{[key: number]: number} = {}; // Map to store the estimated total cost from start to goal through a node

        gScore[startNode.id] = 0;
        fScore[startNode.id] = CalculateDistance(
            startNode,
            endNode
        );

        let aStarNodesTraversed = 0;

        while (openSet.length > 0) {
            aStarNodesTraversed++;

            if (!debug) await sleep(1);
            setTotalNodesTraversed(aStarNodesTraversed);

            let current = openSet.reduce((minNode:Node, node:Node) =>
                fScore[node.id] < fScore[minNode.id] ? node : minNode
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
                    current,
                    neighbor
                );
                let tentativeGScore = gScore[current.id] + dist;

                if (
                    !openSet.includes(neighbor) ||
                    tentativeGScore < gScore[neighbor.id]
                ) {
                    neighbor.parent = current;

                    gScore[neighbor.id] = tentativeGScore;
                    fScore[neighbor.id] =
                        gScore[neighbor.id] +
                        CalculateDistance(
                            neighbor,
                            endNode
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
    function reconstructPathAStar(currentNode: Node) {
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

    async function dijkstra(startNode:Node, endNode:Node, debug = false):Promise<PathfindResult |null> {
        // Initialize distances to all nodes as infinity except for the start node

        let distances: {[key: number]: number} = {};
        let previousNodes: {[key: number]: Node | null} = {};

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
                    currentNode,
                    neighbor
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

    function reconstructPathDijkstra(endNode:Node, previousNodes:{[key: number]: Node | null}) {
        const path = [];
        let currentNode:Node | null = endNode;
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

    async function breadthFirstSearch(startNode:Node, endNode:Node, debug = false):Promise<PathfindResult |null> {
        const queue = [startNode];
        const visited = new Set();
        
        const previousNodes: {[key: number]: Node | null} = {};

        let bfsNodesTraversed = 0;

        while (queue.length > 0) {
            bfsNodesTraversed++;
            if (!debug) await sleep(1);
            setTotalNodesTraversed(bfsNodesTraversed);

            const currentNode = queue.shift();
            if(currentNode == undefined) return null;

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
    function reconstructPathBFS(startNode:Node, endNode:Node, previousNodes: {[key: number]: Node | null}) : Node[] {
        const path: Node[] = [];
        let currentNode:Node | null = endNode;
        while (currentNode !== startNode) {
            path.unshift(currentNode!);
            currentNode = previousNodes[currentNode!.id];
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

    const onHeuristicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

    const onAlgorithmChange = (e:React.ChangeEvent<HTMLSelectElement>) => {
        e.preventDefault();
        let type = e.target.value;
        if (!algorithms.includes(type)) {
            type = "astar";
        }
        setAlgoType(type);
        ResetTraces(true);
        ResetNav();
    };

    function HotFixMissingPaths(startNodeID: number): [Node, Node] {
        // connect node 798 to 354
        GetNodeById(798)!.addNeighbor(GetNodeById(354)!);
        GetNodeById(354)!.addNeighbor(GetNodeById(798)!);
        gPaths.push(new Path(GetNodeById(354)!, GetNodeById(798)!, -1));

        // newNode1 += -37.8460620, 145.1136229

        let newNode1 = GetNodeByCoord(-37.846062, 145.1136229);
        if (newNode1 == null) {
            newNode1 = new Node(802, 145.1136229, -37.846062);
        }

        // connect 601 to newNode1
        GetNodeById(601)!.addNeighbor(newNode1);
        newNode1.addNeighbor(GetNodeById(601)!);
        gPaths.push(new Path(newNode1, GetNodeById(601)!, -1));

        // newNode2 += -37.8461351, 145.1137048
        startNodeID++;
        let newNode2 = GetNodeByCoord(-37.8461351, 145.1137048);
        if (newNode2 == null) {
            newNode2 = new Node(805, 145.1137048, -37.8461351);
        }

        // connect node HF/762 to newNode2
        newNode2.addNeighbor(GetNodeById(762)!);
        GetNodeById(762)!.addNeighbor(newNode2);
        gPaths.push(new Path(newNode2, GetNodeById(762)!, -1));

        // connect newNode1 to newNode2
        newNode1.addNeighbor(newNode2);
        newNode2.addNeighbor(newNode1);
        gPaths.push(new Path(newNode2, newNode1, -1));

        // connect HE/123 to newNode2
        GetNodeById(123)!.addNeighbor(newNode2);
        newNode2.addNeighbor(GetNodeById(123)!);
        gPaths.push(new Path(newNode2, GetNodeById(123)!, -1));

        // connect path near ground floor bus stop area
        GetNodeById(406)!.addNeighbor(GetNodeById(401)!);
        GetNodeById(401)!.addNeighbor(GetNodeById(406)!);
        gPaths.push(new Path(GetNodeById(401)!, GetNodeById(406)!, -1));

        return [newNode1, newNode2];
    }

    const calculatePathCost = (path: Node[]) => {
        let distance = 0;
        for (let i = 0; i < path.length - 1; i++) {
            let node1 = path[i];
            let node2 = path[i+1];
            // let node1: Node = {
            //     lat: path[i].coordinates.lat,
            //     lon: path[i].coordinates.lon,
            // };
            // let node2: Node = {
            //     lat: path[i + 1].coordinates.lat,
            //     lon: path[i + 1].coordinates.lon,
            // };
            distance += CalculateDistance_Haversine(node1, node2);
        }

        return distance;
    };

    async function runTests(e:React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();

        ResetNav();
        ResetTraces(true);

        if (
            !window.confirm(
                "This runs A-Star, Dijkstra's, and Breadth First Search algorithms from Building G -> Hungry Jacks.\n\nPress ok to continue."
            )
        ) {
            return;
        }


        

        let node1 = GetNodeById(92)!; // Building G
        let node2 = GetNodeById(361)!; // Hungry jacks

        const astarResult = await AStar(node1, node2, true);
        const dijkstraResult = await dijkstra(node1, node2, true);
        const bfsResult = await breadthFirstSearch(node1, node2, true);
        const aStarDistance = calculatePathCost(astarResult!.path);
        const dijkstraDistance = calculatePathCost(dijkstraResult!.path);
        const bfsDistance = calculatePathCost(bfsResult!.path);

        let output = "";
        output += `A-Star:\nNodes Traversed: ${
            astarResult!.nodesTraversed
        }. Total Route Distance: ${aStarDistance.toFixed(2)}m\n\n`;
        output += `Dijkstra:\nNodes Traversed: ${
            dijkstraResult!.nodesTraversed
        }. Total Route Distance: ${dijkstraDistance.toFixed(2)}m\n\n`;
        output += `Breadth-First Search:\nNodes Traversed: ${
            bfsResult!.nodesTraversed
        }. Total Route Distance: ${bfsDistance.toFixed(2)}m\n\n`;
        console.log(output);

        alert(output);
        alert("Results can also be found in the developer console.");
    }

    async function RenderFinalPath(path:Node[], color = "fuchsia") {
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

            let node1 = path[i ];
            let node2 = path[i+1]
  
            distance += CalculateDistance_Haversine(node1, node2);
            setPathDistance(distance);
            setPathNodeCount(path.length);
            await sleep(50);

            // Plotly.addTrace('plot', newTrace)
        }
    }

    function AddNewPath(node1:Node, node2:Node, color = "red", label = "") {
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

    function GetNodeById(id:number): Node | null {
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
            let node1 = GetNodeById(path.nodeID1)!;
            let node2 = GetNodeById(path.nodeID2)!;
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

        let hotfix = HotFixMissingPaths(0);
        gNodes.push(...hotfix);

        // Only render nodes that contain a name/label, such as buildings
        const labeledNodes = nodes.filter((node: any) => node.label.trim() !== "");
        // const labeledNodes = nodes;

        nodeTraces = labeledNodes.map((node: NodeData) => ({
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
            lon: [path.startNode.coordinates.lon, path.endNode.coordinates.lon],
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

    const renderAllTraces = (e:React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (
            !window.confirm(
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

    const onClick = (e:any) => {
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

    function DoPathFind(startNode:Node, endNode:Node) {
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

    function GetNodeByCoord(lat:number, lon:number) {
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
                        defaultValue="Haversine"
                        disabled={algoType === "bfs" ? true : false}
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
                    <select
                        id="algorithm_type"
                        onChange={onAlgorithmChange}
                        defaultValue="astar"
                    >
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
                // id="graph"
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
