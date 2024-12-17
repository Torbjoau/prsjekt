import React, {useState, useEffect} from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import { WebMercatorViewport } from '@math.gl/web-mercator'
import { nearestNeighborTSP } from './utils/tspNearestNeighbor';
//import { dijkstraWeather } from './utils/dijkstra';
//import DirectionsButton from './utils/directions';
import SearchBar from './components/searchBar';
import './App.css';

function App() {
  const [viewstate, setViewState] = React.useState({
    longitude: 10.743716,
    latitude: 59.910088,
    zoom: 11,
  });

  const [features, setFeatures] = useState([]);
  const [graph, setGraph] = useState({});
  //const [weatherData, setWeatherdata] = useState(null);
  const [dataTSP, setDataTSP] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [isDistanceImportant, setIstDistanceImportant] = useState(false);

  const handleLocationSelect = async (feature) => {
    const lng = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {method: 'GET'});

    if(!response.ok){
      console.error("Failed to fetch weather data", response.status, response.statusText)
      return;
    }
    const data = await response.json();

    const newFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      place_name: feature.place_name,
      properties: {
        weather: {
          meta: data.properties.meta,
          timeseries: data.properties.timeseries
        }
      },
    };
    setFeatures((prev) => [...prev, newFeature]);
  };

  



  //LAG ET NYTT PUNKT NÅR KLIKKER PÅ KART
  const handleMapClick = async (event) => {
    const {lng, lat } = event.lngLat;
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {method: 'GET'});

    if(!response.ok){
      console.error("Failed to fetch weather data", response.status, response.statusText)
      return;
    }
    const data = await response.json();

    const newFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      place_name: `Point ${features.length + 1}`, // Example: auto-generate names,
      properties: {

        weather: {
          meta: data.properties.meta,
          timeseries: data.properties.timeseries
        }
      },
    };
    setFeatures((prev) => [...prev, newFeature]);
  };


  // Build graph from Mapbox Matrix API
  const buildGraph = async () => {
    if (features.length < 2) {
      console.warn("Need at least two points to build a graph.");
      return;
    }

    // Extract coordinates in the order of features
    const coords = features.map(feature => feature.geometry.coordinates.join(',')).join(';');

    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}?access_token=${token}&annotations=duration,distance`;

    try {
      const response = await fetch(matrixUrl);
      if (!response.ok) {
        throw new Error(`Matrix API request failed: ${response.statusText}`);
      }
      const matrixData = await response.json();
      console.log(matrixData)

      const durations = matrixData.durations; // durations in seconds based on Mapbox API
      const distances = matrixData.distances;



      // Convert matrix to graph
      const graph = matrixToGraph(durations, distances);
      setGraph(graph);
    } catch (error) {
      console.error("Error building graph:", error);
    }
  };


  // Convert matrix to graph
  const matrixToGraph = (durations, distances) => {
    const graph = {};
    
    for (let i = 0; i < durations.length; i++) {
      graph[i] = [];
      for (let j = 0; j < durations[i].length; j++) {
        if (i !== j) {
          const travelTime = durations[i][j];
          const distance = distances[i][j];
          if (travelTime !== null && travelTime !== undefined && distance != null && distance != undefined) {
            graph[i].push({ target: j, travelTime: travelTime, distance: distance });
          }
        }
      }
    }
    
    return graph;
  };

  // Function to find the TSP path using Nearest Neighbor
  const findTspPath = async () => {
    if (!graph || Object.keys(graph).length === 0) {
      console.warn("Graph is empty. Build the graph first.");
      return;
    }

    if (features.length === 0) {
      console.warn("No features to route through.");
      return;
    }

    const startNode = 0; // Define your start node (e.g., first feature)
    const dataTSP = nearestNeighborTSP(graph, features, startNode);
    setDataTSP(dataTSP);
  }

  // Function to get directions from the TSP path
  const getDirectionsFromTspPath = async () => {
    
    if (features.length < 2) {
      console.warn("Need at least two points in TSP path to get directions");
      return;
    }

    const waypoints = dataTSP.path.map(i => features[i].geometry.coordinates);
    const coordinatesString = waypoints.map(coord => coord.join(',')).join(';');
    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?access_token=${token}&geometries=geojson&steps=true&overview=full`;

    try {
      const response = await fetch(directionsUrl);
      if (!response.ok) {
        throw new Error(`Directions API request failed: ${response.statusText}`);
      }
      const directionsData = await response.json();
      if (directionsData.routes && directionsData.routes.length > 0) {
        setRouteData(directionsData.routes[0].geometry);
        console.log("Directions Data:", directionsData);
      } else {
        console.warn("No routes found in Directions API response.");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };
  
  //Get startnode
  const getStartNode = () => {
    if (dataTSP.length == 0) return null;
    return dataTSP[0].path;
  }

  const getEndNode = () => {
    if (dataTSP.length == 0) return null;
    return dataTSP[dataTSP.length -1].path
  }

  const clearAllMarkers = () => {
    setFeatures([]); // Clear all markers
    setDataTSP(null); // Reset the best route information
  };
  /*
  const handleCalculateDistances = async () => {
    //hent koordinater
    const coordsString = features
    .map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return `${lon},${lat}`;
    })
    .join(";");

    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordsString}?access_token=${token}&annotations=distance`;

    try {
      const response = await fetch(url);
      if(!response.ok){
        throw new Error("Matrix API request failed");
      }
      const data = await response.json();

      console.log("Distance Matrix:", data.distances);
    } catch (error) {
      console.error(error);
    }
  };


*/

const onToggleDistanceImportance = () => {
  setIstDistanceImportant((prev) => !prev);
};



  // Effect to build the graph whenever features change
  useEffect(() => {
    if (features.length >= 2) {
      buildGraph();
    }
  }, [features]);

  // Effect to adjust viewport whenever add point/marker
  useEffect(() => {
    if (features.length === 0) return;

    if (features.length == 1) {
      const firstFeature = features[0];
      setViewState((prev) => ({
        ...prev,
        longitude: firstFeature.geometry.coordinates[0],
        latitude: firstFeature.geometry.coordinates[1],
        zoom: 8,
      }));
    } else{
      //if more features; fit map to show all markers
      const coordinates = features.map(feature => feature.geometry.coordinates);

      //Calculate bounds
      const lngs = coordinates.map(coord=>coord[0]);
      const lats = coordinates.map(coord=>coord[1]);

      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      const padding = 100;

      //Webmercator instance
      const viewport = new WebMercatorViewport({
        width: window.innerWidth*0.6,
        height: window.innerHeight,
      });

      //Calc new viewport to fit all markers
      const { longitude, latitude, zoom } = viewport.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        { padding }
      );

      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom
      }));
    }
  }, [features]);

  return (


    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Sidebar on the left */}
      <div style={{
        width:"300px",
        padding: '20px',
        backgroundColor: '#f8f9fa',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <h2>Weather Optimized Route Planner</h2>
        <SearchBar onSelectLocation={handleLocationSelect} />


        {/*Display selected location names below search bar*/}
        {dataTSP && (
          <div style={{ marginTop: '20px' }}>
            <h3>Best Route</h3>
            <ol className="route-list">
              {dataTSP.path.map((nodeIndex, i) => (
                <li key={i}>
                  {!features[nodeIndex].place_name ? "punkt på kart" : features[nodeIndex].place_name}
                  {/* Weather icons are **not** displayed here */}
                </li>
              ))}
            </ol>
          </div>
        )}

        {!dataTSP && features.length > 0 && (
          <div style={{ marginTop: '20px' }}>
          <h3>Selected Locations</h3>
          <ul>
            {features.map((f, i) => (
              <li key={i}>{!f.place_name ? "punkt på kart" : f.place_name}</li>
            ))}
          </ul>
        </div>
        )}

              {/* Checkbox for Distance Importance */}
      <div className="distance-checkbox">
        <input
          type="checkbox"
          id="distanceImportant"
          checked={isDistanceImportant}
          onChange={onToggleDistanceImportance}
        />
        <label htmlFor="distanceImportant">Distance is important</label>
      </div>

        

        {/* You can add more UI components here: 
            - PreferencesPanel
            - DirectionsButton
            - A list of selected locations, etc. */}
      </div>


      {/* MAP COMPONENT */}
      <div style={{ flex: 1, position: 'relative' }}>
    <Map
      {...viewstate}
      onMove={e => setViewState(e.viewState)}
      style={{width:"100%", height:"100%"}}
      mapStyle="mapbox://styles/gyggbridd/cm4rekc5x000401qp4m0w4dhr"
      mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
      onClick={handleMapClick}
    >

          {/* Render Markers based on Best Route */}
          {dataTSP ? (
            dataTSP.path.map((nodeIndex, i) => {
              const feature = features[nodeIndex];
              const weatherDetail = i > 0 ? dataTSP.weatherDetails[i-1] : 0;
              const isFirstMarker = i === 0;
              return (
                <Marker
                  key={nodeIndex}
                  longitude={feature.geometry.coordinates[0]}
                  latitude={feature.geometry.coordinates[1]}
                >
                  <div className="marker-container">
                    {isFirstMarker ? (
                      <button className="marker-btn">
                      <img
                        class="first-marker"
                        src="./assets/homeMarker.svg"
                        alt="Start Marker"
                       
                      />
                    </button>
                    ) : (
                      <div className='red-dot'/>
                    )}
                    

                    {!isFirstMarker && weatherDetail && weatherDetail.symbol_code && (
                      <img 
                        class="weather-icon"
                        src={`./assets/${weatherDetail.symbol_code}.svg`}
                        alt={weatherDetail.symbol_code}
                        
                      />
                    )}
                  </div>
                </Marker>
              );
            })
          ) : (
        
      features.map((feature, index) => (
        <Marker
          key={index}
          longitude={feature.geometry.coordinates[0]}
          latitude={feature.geometry.coordinates[1]}
        >
          {index === 0 ? (
          <button className="marker-btn">
          <img
            class="first-marker1"
            src = "./assets/homeMarker.svg"
            alt = "Start Marker"
            //style = {{ width: '30px', height:'30px'}}
          />  
        </button>
          ) : <div style={{ backgroundColor: "red", borderRadius: "50%", width: "15px", height: "15px", cursor: "pointer"}} />
          }

        </Marker>
          ))
    )}
          {/* Render the route if available */}
          {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#201345",
                "line-width": 6,
                "line-opacity": 0.7
              }}
            />
          </Source>
        )}


        {/* Directional Arrows */}
        {dataTSP && routeData &&(
          <Source id="route-arrows" type="geojson" data={routeData}>
            <Layer
              id="route-arrows"
              type="symbol"
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": 50,
                "icon-allow-overlap": true,
                "icon-rotation-alignment": 'map',
                "icon-image": "rightarrow", // Ensure you have an arrow icon in your sprite
                "icon-size": 0.3
              }}
              paint={{
                "icon-size": 1,
                "icon-color": "#ff0000",
              }}
            />

          </Source>
        )}  

    </Map>
    </div>
      {/* Controls */}
      <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 9999 }}>
        <button onClick={findTspPath} style={buttonStyle}>Find Best Route</button>
        <button onClick={getDirectionsFromTspPath} style={buttonStyle}>Get Directions</button>
        <button onClick={clearAllMarkers} style={buttonStyle}>Clear All Markers</button>
      </div>
      
      
  </div>

  );
}

const buttonStyle = {
  padding: "10px 20px",
  margin: "5px",
  backgroundColor: "green",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default App;




