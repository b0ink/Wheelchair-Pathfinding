module.exports.GetPlotlyLayout = (window) => {
    return {
        responsive: true,
        useResizeHandler: true,
        autosize: true,
        width: window.innerWidth,
        height: window.innerHeight,
        margin: {
            l: 25,
            r: 25,
            b: 50,
            t: 50,
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
};

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

module.exports.CalculateDistance_Haversine = (node1, node2) => {
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
};

module.exports.CalculateDistance_Euclidean = (node1, node2) => {
    const lat1 = node1.lat;
    const lon1 = node1.lon;
    const lat2 = node2.lat;
    const lon2 = node2.lon;

    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    
    return distance;
}

module.exports.CalculateDistance_Manhttan = (node1, node2) => {
    const latDifference = Math.abs(node1.lat - node2.lat);
    const lonDifference = Math.abs(node1.lon - node2.lon);
    return latDifference + lonDifference;
}


module.exports.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
