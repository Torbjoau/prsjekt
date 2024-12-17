import React, { useState } from 'react';

function DirectionsButton({ features, shortestPath }) {
  const [routeData, setRouteData] = useState(null);

  const handleGetDirections = async () => {
    // Extract coords from shortestPath
    const waypoints = shortestPath.map(i => features[i].geometry.coordinates);
    const coordinatesString = waypoints.map(coord => coord.join(',')).join(';');
    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?access_token=${token}&geometries=geojson&steps=true&overview=full`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch directions:", response.statusText);
      return;
    }
    const data = await response.json();
    setRouteData(data);
    console.log("Directions Data:", data);

    // Now you have routeData, which you can use to:
    // - Draw the route line on the map (using a layer with the route's GeoJSON)
    // - Display turn-by-turn instructions
  };

  return (
    <div style={{position:'absolute', top:'10px', right:'10px', zIndex:9999}}>
      <button onClick={handleGetDirections}>Get Directions</button>
      {routeData && <div>Check console for directions data</div>}
    </div>
  );
}

export default DirectionsButton;