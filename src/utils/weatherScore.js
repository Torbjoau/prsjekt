export function calculateWeatherScore(forecastEntry) {
     // Extract data from the MET forecast entry
    const details = forecastEntry?.data?.instant?.details;
    console.log(details)
    if (!details) {
      console.warn("Missing weather details");
      return null;
    }
  
    const T = details.air_temperature; // °C
    const rh = details.relative_humidity; // %
    const W = details.wind_speed; // m/s (ensure this is correct unit)
    
    // For precipitation, try next_1_hours; adjust if needed
    // Gives the precipation amount if it exists, else 0
    const precip = forecastEntry?.data?.next_1_hours?.details?.precipitation_amount ?? 0; // mm
    const symbol_code = forecastEntry?.data?.next_1_hours?.summary?.symbol_code; //Symbol code for weather icon
    if(!symbol_code){
      console.warn("Missing symbol code")
    }
    
    const cloudCover = details.cloud_area_fraction; // %
    if (typeof T !== 'number' || typeof rh !== 'number' || typeof W !== 'number' || typeof cloudCover !== 'number') {
      console.warn("Incomplete weather data for scoring.");
      return null;
    }
  
    // Calculate e for apparent temperature
    // e = (rh/100)*6.105*exp((17.27*T)/(237.7+T))
    const e = (rh / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
  
    // Apparent Temperature: AT = T + 0.33*e - 0.7*W -4
    const AT = T + 0.33 * e - 0.7 * W - 4;
  
    // --------- Effective Temperature Score (0-10) ----------
    let effectiveTempScore;
    if (AT >= 20 && AT <= 26) {
      effectiveTempScore = 0;
    } else if (AT >= 10 && AT < 20) {
      // Linear from 10 points at 10°C down to 1 point at 19°C
      // Range: 10°C to 19°C = 9 degrees
      // Points: 10 at T=10, 1 at T=19
      // slope = (1 - 10)/(19-10) = -9/9 = -1
      // score = 10 + (AT-10)*(-1) = 20 - AT
      // Check at 19°C: 20-19=1, correct.
      effectiveTempScore = 20 - AT;
    } else if (AT > 26 && AT <= 36) {
      // 1 at 27°C to 10 at 36°C
      // Range: 27°C to 36°C = 9 degrees
      // slope = (10-1)/9 = 1
      // score = 1 + (AT-27)*1 = AT-26
      effectiveTempScore = AT - 26;
    } else {
      // Outside [10,36] and not in [20,26], full 10 points
      effectiveTempScore = 10;
    }
  
    // --------- Precipitation Score (0-10) ----------
    let precipitationScore;
    if (precip === 0) {
      precipitationScore = 0;
    } else if (precip > 0 && precip <= 0.5) {
      // 0.1mm => 3p, 0.5mm => 5p
      // Range: 0.1 to 0.5 = 0.4mm difference, 2 points difference
      let p = precip < 0.1 ? 0.1 : precip; 
      precipitationScore = 3 + ((p - 0.1) * (5 - 3) / (0.5 - 0.1));
    } else if (precip > 0.5) {
      // Above 0.5mm: base 5 points at 0.5mm, +1 point per mm until max 10
      // Let excess = precip - 0.5
      // Each mm = +1 point, from 5 to max 10
      const excess = precip - 0.5;
      precipitationScore = Math.min(5 + Math.floor(excess), 10);
    } else {
      precipitationScore = 3;
    }
  
    // --------- Cloud Cover Score (0-10) ----------
    let cloudScore;
    const c = cloudCover;
    if (c >= 10 && c <= 35) {
      cloudScore = 0; 
    } else if (c >= 0 && c < 10) {
      // 0% => 3p, 9% =>1p
      // slope = (1-3)/(9-0) = -2/9
      // score = 3 + (c-0)*(-2/9) = 3 - 2c/9
      cloudScore = 3 - (2 * c / 9);
    } else if (c >= 36 && c <= 50) {
      // 36% =>1p, 50%=>5p
      // slope = (5-1)/(50-36)=4/14 ~0.2857
      // score = 1+(c-36)*0.2857
      cloudScore = 1 + (c - 36) * (4 / 14);
    } else if (c > 50 && c <= 100) {
      // 50% =>5p, 100%=>10p
      // slope = (10-5)/(100-50)=5/50=0.1
      // score = 5+(c-50)*0.1
      cloudScore = 5 + (c - 50) * 0.1;
    } else if (c > 100) {
      // If somehow c>100, cap at 10p
      cloudScore = 10;
    } else {
      cloudScore = 3; // at 0% we had 3 points
    }
  
    // --------- Wind Speed Score (0-10) ----------
    // no wind =0 km/h => 2p
    // [1-9 km/h] =>0p
    // [10-30 km/h]:1-5p linearly
    // [30-40 km/h]:5-10p linearly
    // >40:10p
    function windScoreFromKMH(speed) {
      if (speed === 0) return 2;
      if (speed >= 1 && speed <= 9) {
        return 0; 
      } else if (speed >= 10 && speed <= 30) {
        // 10 km/h =1p, 30 km/h=5p
        // slope=(5-1)/(30-10)=4/20=0.2
        // score=1+(speed-10)*0.2
        return 1 + (speed - 10) * 0.2;
      } else if (speed > 30 && speed <= 40) {
        // 30=5p, 40=10p
        // slope=(10-5)/10=0.5
        // score=5+(speed-30)*0.5
        return 5 + (speed - 30) * 0.5;
      } else if (speed > 40) {
        return 10;
      } else {
        return 1; 
      }
    }
  
    // If your wind speed W is in m/s, convert to km/h for these rules:
    const windKMH = W * 3.6;
    const windScore = windScoreFromKMH(windKMH);
  
    // --------- Combine Scores with Weights ----------
    // Weights: 
    // Effective Temperature: 40%
    // Precipitation: 30%
    // Cloud Cover: 15%
    // Wind Speed: 15%
  
    const finalScore = 
      effectiveTempScore * 0.4 +
      precipitationScore * 0.3 +
      cloudScore * 0.15 +
      windScore * 0.15;
  
    return {
      finalScore,
      symbol_code
  }
}