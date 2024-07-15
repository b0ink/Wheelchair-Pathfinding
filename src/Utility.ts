import { Node } from "./types";

export function GetPlotlyLayout(window: Window): any {
    return {
        responsive: true,
        useResizeHandler: true,
        autosize: true,
        width: window.innerWidth,
        height: window.innerHeight - 200,
        margin: {
            l: 25,
            r: 25,
            b: 50,
            t: 25,
            pad: 0,
        },
        legend: {
            bgcolor: "#313b3c",
            font: {
                color: "#FFF",
            },
        },
        paper_bgcolor: "#313b3c",
        hovermode: "closest",
        clickmode: "event",
        mapbox: {
            style: "open-street-map",
            center: { lon: 145.11280923809354, lat: -37.847196668316924 },
            zoom: 16,
        },
    };
}

// module.exports.GetPlotlyLayout = GetPlotlyLayout;

function toRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
}

export function CalculateDistance_Haversine(node1: Node, node2: Node): number {
    const earthRadius = 6371000; // Earth's radius in meters
    const lat1 = node1.coordinates.lat;
    const lon1 = node1.coordinates.lon;
    const lat2 = node2.coordinates.lat;
    const lon2 = node2.coordinates.lon;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    return distance;
}

export function CalculateDistance_Euclidean(node1: Node, node2: Node) {
    const lat1 = node1.coordinates.lat;
    const lon1 = node1.coordinates.lon;
    const lat2 = node2.coordinates.lat;
    const lon2 = node2.coordinates.lon;

    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    return distance;
}

export function CalculateDistance_Manhattan(node1: Node, node2: Node) {
    const latDifference = Math.abs(node1.coordinates.lat - node2.coordinates.lat);
    const lonDifference = Math.abs(node1.coordinates.lon - node2.coordinates.lon);
    const distance = latDifference + lonDifference;
    return distance;
}

export function CalculateDistance_Diagonal(node1: Node, node2: Node) {
    const dx = Math.abs(node1.coordinates.lat - node2.coordinates.lat);
    const dy = Math.abs(node1.coordinates.lon - node2.coordinates.lon);
    var min = Math.min(dx, dy);
    var diag = Math.sqrt(2);
    const distance = min * diag + Math.abs(dx - dy);
    return distance;
}

export function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
