import findForecastHour from "./findForecastHour";
import { calculateWeatherScore } from "./weatherScore";

/**
 * Finds a TSP route using the Nearest Neighbor heuristic.
 * @param {Object} graph - Adjacency list { [node]: [{target, travelTime}, ...] }
 * @param {Array} features - Array of features with weather data
 * @param {number} startNode - The starting node index
 * @returns {Array} - Ordered list of node indices representing the path
 */
export function nearestNeighborTSP(graph, features, startNode, isDistanceImportant) {
    const visited = new Set();
    const path = [startNode];
    visited.add(startNode);
    let currentNode = startNode;

    const weatherDetails = [];
  
    while (visited.size < Object.keys(graph).length) {
      let nearest = null;
      let minCost = Infinity;
      let bestWeatherCost = null;
  
      for (const edge of graph[currentNode]) {
        const { target, travelTime, distance } = edge;
        if (!visited.has(target)) {
          // Calculate arrival time

          const arrivalTime = calculateArrivalTime(path, graph, travelTime, features, target);
          
          // Get weather cost
          const forecastEntry = findForecastHour(features[target], arrivalTime);
          if(!forecastEntry) continue;


          const weatherCost = calculateWeatherScore(forecastEntry);
          let compositeScore;
          if(isDistanceImportant) {
            compositeScore = distance*weatherCost.finalScore 
          } else {
            compositeScore = weatherCost.finalScore
          }
          // Total cost: weather cost (since we’re optimizing based solely on weather)
          if (compositeScore !== null && compositeScore < minCost) {
            minCost = compositeScore;
            nearest = target;
            bestWeatherCost = weatherCost;
          }
        }
      }
  
      if (nearest !== null) {
        path.push(nearest);
        visited.add(nearest);
        currentNode = nearest;

        if (bestWeatherCost) {
            weatherDetails.push({
                nodeIndex: nearest,
                finalScore: bestWeatherCost.finalScore,
                symbol_code: bestWeatherCost.symbol_code
            })
        }
      } else {
        // No unvisited nodes reachable (disconnected graph)
        break;
      }
    }
  
    // Optionally, return to start node to complete the cycle
    // path.push(startNode);
  
    return {
        path,
        weatherDetails
    }
  }
  
  /**
   * Calculates the arrival time based on the current path.
   * @param {Array} path - Current path as a list of node indices
   * @param {Object} graph - Adjacency list
   * @param {number} travelTime - Travel time to the next node
   * @param {Array} features - Array of features with weather data
   * @param {number} target - Target node index
   * @returns {number} - Arrival time in minutes
   */
  function calculateArrivalTime(path, graph, travelTime, features, target) {
    let totalTime = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const edge = graph[current].find(e => e.target === next);
      if (edge) {
        totalTime += edge.travelTime;
      }
    }
    // Add the travel time to the target
    totalTime += travelTime;
    return totalTime;
  }