import { calculateWeatherScore } from "./weatherScore";

class PriorityQueue {
    constructor() {
      this.heap = [];
    }
  
    isEmpty() {
      return this.heap.length === 0;
    }
  
    push(element, priority) {
      this.heap.push({ element, priority });
      this._bubbleUp(this.heap.length - 1);
    }
  
    pop() {
      if (this.heap.length === 0) return null;
      this._swap(0, this.heap.length - 1);
      const popped = this.heap.pop();
      this._sinkDown(0);
      return popped.element;
    }
  
    _bubbleUp(index) {
      const current = this.heap[index];
      while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        const parent = this.heap[parentIndex];
        if (parent.priority <= current.priority) break;
        this._swap(index, parentIndex);
        index = parentIndex;
      }
    }
  
    _sinkDown(index) {
      const length = this.heap.length;
      const current = this.heap[index];
  
      while (true) {
        let leftIndex = 2 * index + 1;
        let rightIndex = 2 * index + 2;
        let swapIndex = null;
  
        if (leftIndex < length) {
          const left = this.heap[leftIndex];
          if (left.priority < current.priority) {
            swapIndex = leftIndex;
          }
        }
  
        if (rightIndex < length) {
          const right = this.heap[rightIndex];
          if ((swapIndex === null && right.priority < current.priority) ||
              (swapIndex !== null && right.priority < this.heap[swapIndex].priority)) {
            swapIndex = rightIndex;
          }
        }
  
        if (swapIndex === null) break;
        this._swap(index, swapIndex);
        index = swapIndex;
      }
    }
  
    _swap(i, j) {
      [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
  }


function findForecastHour(feature, arrivalTimeInMinutes){
    const timeseries = feature.properties.weather.timeseries;
    const hour = Math.round(arrivalTimeInMinutes/60)
    if(hour >= timeseries.length){
        return timeseries[timeseries.length - 1];
    }
    return timeseries[hour];
}



// Dijkstra modified to minimize weather cost only
export function dijkstraWeather(graph, features, start) {
    const nodes = Object.keys(graph).map(Number);
    const distances = {};
    const predecessors = {};
    const times = {}; // track arrival times for weather lookup
    const pq = new PriorityQueue();
  
    // Initialize
    for (let node of nodes) {
      distances[node] = Infinity;
      times[node] = Infinity;
      predecessors[node] = null;
    }
    distances[start] = 0;
    times[start] = 0;
    pq.push(start, 0);
  
    while (!pq.isEmpty()) {
      const current = pq.pop();
      const currentDist = distances[current];
      const currentTime = times[current];
  
      for (const edge of graph[current]) {
        const { target, travelTime } = edge;
        
        // Calculate arrival time at target (in minutes)
        const arrivalTime = currentTime + travelTime; 
        
        // Find the forecast entry for that arrival time
        const forecastEntry = findForecastHour(features[target], arrivalTime);
        
        if (!forecastEntry) {
            console.warn(`No forecast entry found for node ${target} at arrival time ${arrivalTime} minutes.`);
            continue;
          }
        
        // Calculate the weather cost at arrival
        const weatherCost = calculateWeatherScore(forecastEntry);

        if (weatherCost === null) {
            console.warn(`Weather cost is null for node ${target} at arrival time ${arrivalTime} minutes.`);
            continue;
          }
  
        const newCost = currentDist + weatherCost;
        if (newCost < distances[target]) {
          distances[target] = newCost;
          times[target] = arrivalTime;
          predecessors[target] = current;
          pq.push(target, newCost);
        }
      }
    }
  
    return { distances, predecessors, times };
  }