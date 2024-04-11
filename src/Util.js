function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

module.exports.calculateDistance = (node1, node2) => {
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
