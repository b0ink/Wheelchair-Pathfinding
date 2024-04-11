import logo from "./logo.svg";
import "./App.css";
import Plot from "react-plotly.js";
import { useEffect, useState, useMemo } from "react";

import update from "immutability-helper";

let gNodes = [];
let gPaths = [];
let node1Selection = null;
let node2Selection = null;

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
function calculateDistance(node1, node2) {
    // return euclideanDistance(node1, node2);

    const earthRadius = 6371000; // Earth's radius in meters
    const lat1 = node1.lat;
    const lon1 = node1.lon;
    const lat2 = node2.lat;
    const lon2 = node2.lon;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    return distance;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


function App() {
    const [traces, setTraces] = useState([]);
    const [token, setToken] = useState(null);

    //   nodeTraces = labeledNodes.map((node) => ({
    //     type: "scattermapbox",
    //     mode: "markers",
    //     lon: [node.coordinate.long],
    //     lat: [node.coordinate.lat],
    //     marker: {
    //         size: 15,
    //         color: "blue",
    //     },
    //     text: node.label,
    //     name: node.label, // Set the name to the node label
    // }));

    async function AStar(startNode, endNode) {
        let openSet = [startNode];
        let closedSet = [];
        let gScore = {}; // Map to store the cost from start along best known path
        let fScore = {}; // Map to store the estimated total cost from start to goal through a node

        gScore[startNode] = 0;
        fScore[startNode] = calculateDistance(startNode, endNode);

        let count1 = 0;
        let count2 = 0;

        let notGoodEnoughNodes = [];
        while (openSet.length > 0) {
            count1++;

            //TODO:

            let current = openSet.reduce((minNode, node) =>
                fScore[node] < fScore[minNode] ? node : minNode
            );

            // let current = openSet.reduce((minNode, node) => {
            //     if (fScore[node] < fScore[minNode]) {
            //         // AddNewPath(node, node.parent, "green", "a");
            //         return node;
            //     } else {
            //         // AddNewPath(minNode, minNode.parent, "red", "asdf1");
            //         // AddNewPath(minNode, minNode.parent, "red", "s");
            //         return minNode;
            //     }
            // });

            if (current === endNode) {
                console.log("count1", count1);
                console.log("count2", count2);
                return reconstructPath(endNode);
            }

            openSet = openSet.filter((node) => node !== current);
            closedSet.push(current);
            
            // AddNewPath(current, node, "orange", "test");

            for (let neighbor of current.neighbors) {
                count2++;
                if (closedSet.includes(neighbor)) {
                    continue;
                }

                let tentativeGScore =
                    gScore[current] + calculateDistance(current, neighbor);

                AddNewPath(current, neighbor, "red", tentativeGScore.toString());
                await sleep(5);

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
                        gScore[neighbor] + calculateDistance(neighbor, endNode);

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

    // Function to reconstruct the path from start to end
    function reconstructPath(currentNode) {
        console.log(currentNode);
        let count = 0;
        const path = [currentNode];
        while (currentNode.parent) {
            path.unshift(currentNode.parent);
            currentNode = currentNode.parent;
            if(count > 1000){
                console.log('wtf?');
                break;
            }
            count++;
        }
        if(count > 1000){
            return null;
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
                    color: "blue",
                },
            };

            traces.push(newTrace);
            setTraces([...traces]);
            // await sleep(50);
            let node1 = {
                lat: path[i].coordinates.lat,
                lon: path[i].coordinates.lon,
            };
            let node2 = {
                lat: path[i + 1].coordinates.lat,
                lon: path[i + 1].coordinates.lon,
            };
            distance += calculateDistance(node1, node2);

            // Plotly.addTrace('plot', newTrace)
        }
        console.log("DISTANCE TO GET THERE:, ", distance);
        

    }



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
        console.log('adding new trace');
        return newTrace;
    }

    // const layout = {
    const [layout, setLayout] = useState({
        autosize: false,
        width: 1200,
        height: 900,
        margin: {
            l: 50,
            r: 50,
            b: 100,
            t: 100,
            pad: 4,
        },
        hovermode: "closest",
        mapbox: {
            style: "open-street-map",
            center: { lon: 145.1155302, lat: -37.8480303 },
            zoom: 15,
        },
    });

    // const [figure, setFigure] = useState({ data: [], layout: layout });


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
        console.log('gnodes', gNodes)

        for (let path of paths) {
            let node1 = GetNodeById(path.nodeID1);
            let node2 = GetNodeById(path.nodeID2);
            node1.addNeighbor(node2);
            node2.addNeighbor(node1);
            // console.log(node1, node2, path.cost);
            let newPath = new Path(node1, node2, path.cost);
            gPaths.push(newPath);
        }

        const labeledNodes = nodes.filter((node) => node.label.trim() !== "");

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

        setTraces([...nodeTraces]);
        // setRevision(revision + 1);
        setToken(true);
        // https://stackoverflow.com/questions/77977461/updating-single-data-point-in-react-plotly-without-re-rendering-entire-plot
        // setTimeout(() => {
        //     let index = 0;
        //     for (let trace of nodeTraces) {
        //         trace.marker.color = "red";
        //         index++;
        //         if (index > 7) {
        //             break;
        //         }
        //     }

        //     // setRevision(revision+1);
        //     setTraces([...nodeTraces]);

        //     let newData = []

        //     for(let i = 1000; i<=5000;i+= 1000){
        //       setTimeout(()=>{
        //         for(let j = 0; j < gNodes.length-1;j++){
        //           if(Math.random() < 0.05){
        //             newData.push(AddNewPath(gNodes[j], gNodes[j+1]));
        //           }
        //         }
        //         setTraces([...nodeTraces, ...newData]);
        //         newData = []
        //       },i)
        //     }

        //     setTimeout(()=>{
        //       // clears paths
        //       setTraces([...nodeTraces]);
        //     }, 10000);
        // }, 5000);
    };
    // let dataRetrieved = false;

    useEffect(() => {
        // if (!dataRetrieved) {
        //     console.log("test");
        //     dataRetrieved = true;
        // }
        if (token == null) getData();
    }, [token]);
    // getData();


    const onClick = (e) => {
        console.log(e.points[0]);
        console.log(traces);

        let index = e.points[0].fullData.index;
        if(e.points[0].data.mode !== "markers"){
            console.log('not a marker')
            return;
        }


        let newTraces = [];
        for(let trace of traces){
            if(trace.mode !== 'lines'){
                newTraces.push(trace);
            }
        }
        // setTraces([...newTraces]);

        for (let i = 0; i < newTraces.length; i++) {
            if(newTraces[i].mode == "markers"){
                if (i == index) {
                    newTraces[i].marker.color = "red";
                } else {
                    newTraces[i].marker.color = "blue";
                }
            }

        }
        setTraces([...newTraces]);

        const point = e.points[0];
        console.log(point.lat, point.lon)
        if (node1Selection === null) {
            node1Selection = GetNodeByCoord(point.lat, point.lon);
            console.log("found node1selection", node1Selection);
        } else if (node2Selection === null) {
            node2Selection = GetNodeByCoord(point.lat, point.lon);
            console.log("found node2selection", node2Selection);

            if (node2Selection != null) {
                console.log('pathfinding betweem', node1Selection, node2Selection)
                DoPathFind(node1Selection, node2Selection);
            }
            node1Selection = null;
            node2Selection = null;
            

            //! clear previous AStar node.parent assigning
            for(let node of gNodes){
                if(node.parent){
                    node.parent = null;
                }
            }

        } else {
            node1Selection = null;
            node2Selection = null;
        }
    };

    function DoPathFind(startNode, endNode) {
        // const startNode = GetNodeById(148); // Library
        // const endNode = GetNodeById(786); // OVAL
        console.log(startNode, endNode);
        const path = AStar(startNode, endNode);
        return; // todo

        console.log(path);
        if (!path) return;
        console.log("updating route colros?");
    }
    function GetNodeByCoord(lat, lon) {
        console.log(gNodes)
        for (let node of gNodes) {
            if (node.coordinates.lat == lat && node.coordinates.lon == lon) {
                return node;
            }
        }
        return null;
    }

    return (
        <div className="App">
            <Plot
                data={traces}
                layout={layout}
                onUpdate={(figure) => setLayout(figure.layout)}
                // onInitialized={(figure) => setFigure(figure)}
                revision={revision}
                onClick={onClick}
            />

            {/*             
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Edit <code>src/App.js</code> and save to reload.
                </p>
                <a
                    className="App-link"
                    href="https://reactjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Learn React
                </a>
            </header> */}
        </div>
    );
}

export default App;
