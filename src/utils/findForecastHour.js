function findForecastHour(feature, arrivalTimeInSeconds){
    const timeseries = feature.properties.weather.timeseries;
    const hour = Math.round(arrivalTimeInSeconds/3600)
    if(hour >= timeseries.length){
        return timeseries[timeseries.length - 1];
    }
    console.log("HOUR" + hour)
    console.log("Arrivaltime in seconds" + arrivalTimeInSeconds)
    return timeseries[hour];
}

export default findForecastHour;