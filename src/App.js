import logo from "./logo.svg";
import "./App.css";
import Plot from "react-plotly.js";
import { useEffect, useState, useMemo } from "react";

import update from "immutability-helper";

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

    var gNodes = [];
    var gPaths = [];

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

        for (let node of nodes) {
            gNodes.push(
                new Node(node.id, node.coordinate.long, node.coordinate.lat)
            );
        }

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

        for (let i = 0; i < traces.length; i++) {
            if (i == index) {
                traces[i].marker.color = "red";
            } else {
                traces[i].marker.color = "blue";
            }
        }
        setTraces([...traces])
    };

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
