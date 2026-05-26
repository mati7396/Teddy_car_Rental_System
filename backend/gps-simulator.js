const BASE_URL = process.env.API_URL ? process.env.API_URL.replace('/tracking/simulate', '') : 'http://localhost:5000/api';
const SIMULATE_URL = `${BASE_URL}/tracking/simulate`;
const ACTIVE_VEHICLES_URL = `${BASE_URL}/tracking/active-vehicles`;

// Addis Ababa center
const DEFAULT_LAT = 9.0227;
const DEFAULT_LON = 38.7460;

// Teddy Car Rental Office Garage coordinates (Bole, Addis Ababa)
const OFFICE_GARAGE_LAT = 9.0035;
const OFFICE_GARAGE_LON = 38.7825;

// Internal state of active simulations
let activeSimulations = new Map(); // vehicleId -> simulationObject

function parsePickupLocation(locationStr) {
  if (!locationStr) return null;

  // Custom check for Alem Bank neighborhood
  const normalized = locationStr.toLowerCase();
  if (normalized.includes('alembank') || normalized.includes('alem bank')) {
    return { lat: 9.0005, lon: 38.6781 };
  }

  // Try to find coordinates in string like "9.02, 38.74" or JSON
  const coordMatch = locationStr.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) };
  }
  
  // Fallback hashing matching frontend exactly (with 0.005 offset)
  let hash = 0;
  for (let i = 0; i < locationStr.length; i++) {
    hash = locationStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (Math.abs(hash % 100) / 2000) - 0.025 + 0.005;
  const lngOffset = (Math.abs((hash >> 8) % 100) / 2000) - 0.025 + 0.005;
  return { lat: 9.0227 + latOffset, lon: 38.7460 + lngOffset };
}

function generateRoutePath(start, end) {
  const lat1 = start.lat;
  const lon1 = start.lon;
  const lat2 = end.lat;
  const lon2 = end.lon;

  // Stagger parameters for the green "Shortcut" route: -1.8, 1.8
  const staggerLat = -1.8;
  const staggerLng = 1.8;

  const mid1 = [
    lat1 + (lat2 - lat1) * 0.3 + staggerLat * 0.003,
    lon1 + (lon2 - lon1) * 0.35 + staggerLng * 0.003
  ];
  const mid2 = [
    lat1 + (lat2 - lat1) * 0.7 - staggerLat * 0.002,
    lon1 + (lon2 - lon1) * 0.65 + staggerLng * 0.002
  ];

  const controlPoints = [[lat1, lon1], mid1, mid2, [lat2, lon2]];
  
  // Generate a smooth interpolated path of 60 points
  const points = [];
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let pt;
    if (t < 0.33) {
      const localT = t / 0.33;
      pt = {
        lat: lat1 + (mid1[0] - lat1) * localT,
        lon: lon1 + (mid1[1] - lon1) * localT
      };
    } else if (t < 0.66) {
      const localT = (t - 0.33) / 0.33;
      pt = {
        lat: mid1[0] + (mid2[0] - mid1[0]) * localT,
        lon: mid1[1] + (mid2[1] - mid1[1]) * localT
      };
    } else {
      const localT = (t - 0.66) / 0.34;
      pt = {
        lat: mid2[0] + (lat2 - mid2[0]) * localT,
        lon: mid2[1] + (lon2 - mid2[1]) * localT
      };
    }
    points.push(pt);
  }
  return points;
}

function createVehicleState(vehicle) {
  let startPos;
  let targetPos;
  let routePoints = null;
  let routeIndex = 0;

  if (vehicle.isDelivery && vehicle.deliveryStatus !== 'DELIVERED') {
    // Delivery: starts at office garage and delivers to customer's deliveryLocation
    startPos = { lat: OFFICE_GARAGE_LAT, lon: OFFICE_GARAGE_LON };
    targetPos = parsePickupLocation(vehicle.deliveryLocation) || {
      lat: OFFICE_GARAGE_LAT,
      lon: OFFICE_GARAGE_LON
    };
    routePoints = generateRoutePath(startPos, targetPos);
    console.log(`[STATE] Delivery Vehicle ${vehicle.vehicleId} starts at Office Garage -> delivers to ${vehicle.deliveryLocation || 'customer'} along route path.`);
  } else {
    // Normal rental (or already delivered rental): starts at pickupLocation / deliveryLocation
    const locationToUse = vehicle.isDelivery ? vehicle.deliveryLocation : vehicle.pickupLocation;
    startPos = parsePickupLocation(locationToUse) || {
      lat: DEFAULT_LAT + (Math.random() - 0.5) * 0.05,
      lon: DEFAULT_LON + (Math.random() - 0.5) * 0.05
    };
    targetPos = {
      lat: startPos.lat + (Math.random() - 0.5) * 0.02,
      lon: startPos.lon + (Math.random() - 0.5) * 0.02
    };
  }

  return {
    id: vehicle.vehicleId,
    lat: startPos.lat,
    lon: startPos.lon,
    targetLat: targetPos.lat,
    targetLon: targetPos.lon,
    routePoints,
    routeIndex,
    speed: 0,
    model: vehicle.carModel,
    startDate: new Date(vehicle.startDate),
    endDate: new Date(vehicle.endDate),
    isDelivery: vehicle.isDelivery,
    assignedDriver: vehicle.assignedDriver,
    deliveryStatus: vehicle.deliveryStatus,
    deliveryLocation: vehicle.deliveryLocation,
    running: true
  };
}

function updateVehicle(vehicle) {
  if (vehicle.isDelivery && vehicle.deliveryStatus !== 'DELIVERED' && vehicle.routePoints && vehicle.routePoints.length > 0) {
    if (vehicle.deliveryStatus === 'ON_THE_WAY') {
      if (vehicle.routeIndex === undefined || vehicle.routeIndex === null) {
        vehicle.routeIndex = 0;
      }
      if (vehicle.routeIndex < vehicle.routePoints.length - 1) {
        vehicle.routeIndex++;
        vehicle.speed = Math.floor(Math.random() * 41) + 30; // 30-70 km/h realistic driving
        if (Math.random() < 0.05) vehicle.speed = 0;
      } else {
        vehicle.speed = 0;
      }
    } else {
      // ASSIGNED or ACCEPTED: stationary at start
      vehicle.routeIndex = 0;
      vehicle.speed = 0;
    }
    const currentPoint = vehicle.routePoints[vehicle.routeIndex];
    vehicle.lat = currentPoint.lat;
    vehicle.lon = currentPoint.lon;
  } else {
    // Normal rental: starts at pickupLocation
    const step = 0.0001 + (Math.random() * 0.00005); 
    const dist = Math.sqrt(Math.pow(vehicle.targetLat - vehicle.lat, 2) + Math.pow(vehicle.targetLon - vehicle.lon, 2));
    
    if (dist < step) {
      vehicle.targetLat = vehicle.lat + (Math.random() - 0.5) * 0.02;
      vehicle.targetLon = vehicle.lon + (Math.random() - 0.5) * 0.02;
    }
    
    const angle = Math.atan2(vehicle.targetLon - vehicle.lon, vehicle.targetLat - vehicle.lat);
    vehicle.lat += step * Math.cos(angle);
    vehicle.lon += step * Math.sin(angle);
    vehicle.speed = Math.floor(Math.random() * 41) + 30; // 30-70 km/h realistic driving
    if (Math.random() < 0.05) vehicle.speed = 0; // stop at red lights
  }
}

async function sendGpsUpdate(vehicle) {
  const payload = {
    vehicleId: vehicle.id,
    lat: parseFloat(vehicle.lat.toFixed(6)),
    lng: parseFloat(vehicle.lon.toFixed(6)),
    speed: vehicle.speed,
    assignedDriver: vehicle.assignedDriver,
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(SIMULATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      console.log(`[OK] ${vehicle.id} (${vehicle.model}) | Lat: ${payload.lat}, Lng: ${payload.lng} | Speed: ${payload.speed} km/h`);
    }
  } catch (err) {
    console.error(`[ERR] ${vehicle.id} - Connection failed: ${err.message}`);
  }
}

async function refreshVehicleList() {
  try {
    const res = await fetch(ACTIVE_VEHICLES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const { data } = await res.json();
    const currentActiveIds = new Set(data.map(v => v.vehicleId));

    // Remove finished simulations
    for (const [id, state] of activeSimulations.entries()) {
      if (!currentActiveIds.has(id)) {
          console.log(`[STOP] Simulation for ${id} (Rental completed or inactive)`);
          state.running = false;
          activeSimulations.delete(id);
      }
    }

    // Add new simulations or update existing ones
    for (const v of data) {
      if (!activeSimulations.has(v.vehicleId)) {
        console.log(`[START] New simulation for ${v.vehicleId} (${v.carModel})`);
        const newState = createVehicleState(v);
        activeSimulations.set(v.vehicleId, newState);
        startVehicleLoop(newState);
      } else {
        const state = activeSimulations.get(v.vehicleId);
        state.deliveryStatus = v.deliveryStatus;
        state.assignedDriver = v.assignedDriver;
        state.isDelivery = v.isDelivery;
        state.startDate = new Date(v.startDate);
        state.endDate = new Date(v.endDate);
        if (state.isDelivery && state.deliveryLocation !== v.deliveryLocation) {
          state.deliveryLocation = v.deliveryLocation;
          const startPos = { lat: OFFICE_GARAGE_LAT, lon: OFFICE_GARAGE_LON };
          const targetPos = parsePickupLocation(v.deliveryLocation) || startPos;
          state.targetLat = targetPos.lat;
          state.targetLon = targetPos.lon;
          state.routePoints = generateRoutePath(startPos, targetPos);
          state.routeIndex = 0;
        }
      }
    }
    
    if (activeSimulations.size === 0) {
      console.log(`[IDLE] No active rentals found to simulate. Waiting...`);
    }

  } catch (err) {
    console.error(`[SYNC ERR] Failed to refresh active vehicles: ${err.message}`);
  }
}

function startVehicleLoop(vehicle) {
  const loop = async () => {
    if (!vehicle.running) return;
    
    const now = new Date();
    const isWithinDeliveryWindow = vehicle.isDelivery && 
                                  now >= new Date(vehicle.startDate.getTime() - 30 * 60 * 1000) && 
                                  now <= vehicle.startDate;
                                  
    const isDeliveryActive = vehicle.isDelivery && 
                             ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY'].includes(vehicle.deliveryStatus);

    if ((now >= vehicle.startDate && now <= vehicle.endDate) || isWithinDeliveryWindow || isDeliveryActive) {
      if (isDeliveryActive && now < vehicle.startDate) {
        console.log(`[DELIVERY] ${vehicle.id} - Moving to customer. Status: ${vehicle.deliveryStatus}`);
      } else if (isWithinDeliveryWindow) {
        console.log(`[DELIVERY] ${vehicle.id} - Moving to customer (Delivery starts in ${Math.round((vehicle.startDate - now) / 60000)} mins)`);
      }
      updateVehicle(vehicle);
      await sendGpsUpdate(vehicle);
    } else if (now < vehicle.startDate && !vehicle.isDelivery) {
      console.log(`[WAIT] ${vehicle.id} - Rental hasn't started yet (Starts: ${vehicle.startDate.toLocaleString()})`);
    } else if (now > vehicle.endDate) {
      console.log(`[STOP] ${vehicle.id} - Rental period ended. Stopping local loop.`);
      vehicle.running = false;
      return;
    }

    setTimeout(loop, Math.floor(Math.random() * 3000) + 2000);
  };
  setTimeout(loop, Math.random() * 2000);
}

async function runSimulation() {
  console.log(`===========================================`);
  console.log(`  Dynamic GPS Tracking Simulator`);
  console.log(`  Targeting only ACTIVE rented cars`);
  console.log(`  Base API: ${BASE_URL}`);
  console.log(`  Refresh interval: 30s`);
  console.log(`  Press Ctrl+C to stop.`);
  console.log(`===========================================\n`);

  // Initial sync
  await refreshVehicleList();

  // Periodic sync every 30 seconds
  setInterval(refreshVehicleList, 30000);
}

runSimulation();
