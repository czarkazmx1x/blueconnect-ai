import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { BlueLinky } from 'bluelinky';

const app = express();
// Use the system port if available, otherwise 3001
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory storage for the active session
// Note: For a production app with multiple users, you would need a database
// and session management strategy (e.g., Redis) instead of a global variable.
let client = null;
const vehicleCache = new Map();

// Helper to map Bluelinky raw response to our App's VehicleStatus interface
const mapToAppStatus = (raw) => {
  // The structure of 'raw' depends on the specific vehicle and bluelinky version.
  // This mapping attempts to normalize common fields.
  if (!raw) {
    console.error('mapToAppStatus received null/undefined raw data');
    throw new Error('No status data received from vehicle');
  }

  const s = raw.vehicleStatus || raw;

  // Helper for door status (0 is usually closed, 1 is open)
  const isOpen = (val) => val === 1 || val === true;

  return {
    engine: s.engine ? 'ON' : 'OFF',
    doors: {
      locked: s.doorLock || false,
      hoodOpen: isOpen(s.doorOpen?.hood),
      trunkOpen: isOpen(s.doorOpen?.trunk),
      frontLeftOpen: isOpen(s.doorOpen?.frontLeft),
      frontRightOpen: isOpen(s.doorOpen?.frontRight),
      backLeftOpen: isOpen(s.doorOpen?.backLeft),
      backRightOpen: isOpen(s.doorOpen?.backRight),
    },
    climate: {
      active: s.airCtrlOn || false,
      temperature: s.airTemp?.value || 72,
      defrost: s.defrost || false,
    },
    battery: {
      percentage: s.evStatus?.batteryStatus || 0,
      range: s.evStatus?.drvDistance?.[0]?.rangeByFuel?.evModeRange?.value || 0,
      charging: s.evStatus?.batteryCharge || false,
    },
    fuel: {
      level: s.fuelLevel || 0,
      range: s.dte?.value || 0,
    },
    odometer: s.odometer || 0,
    lastUpdated: new Date().toISOString(),
  };
};

app.post('/api/login', async (req, res) => {
  const { username, password, pin, region } = req.body;
  
  console.log(`Attempting login for ${username}...`);

  try {
    client = new BlueLinky({
      username,
      password,
      pin,
      region: region || 'US' // Default to US
    });

    await client.login();
    console.log('Login successful');
    res.json({ success: true });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(401).json({ error: 'Authentication failed', details: error.message });
  }
});

app.get('/api/vehicles', async (req, res) => {
  if (!client) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const vehicles = await client.getVehicles();
    const responseData = [];

    for (const v of vehicles) {
      vehicleCache.set(v.vin(), v);

      // We perform a lightweight fetch or use cached data if available
      // For the initial list, we return basic info
      responseData.push({
        vin: v.vin(),
        nickname: v.nickname(),
        modelName: v.name(),
        year: v.year || 2024, // year might be a property, not a method
        color: 'Unknown', // Bluelinky might not provide this directly in the summary
        status: null, // Will be fetched specifically
        location: null
      });
    }
    res.json(responseData);
  } catch (error) {
    console.error('Fetch vehicles failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Full Status
app.post('/api/vehicles/:vin/status', async (req, res) => {
  const { vin } = req.params;
  const { refresh } = req.body;
  
  const vehicle = vehicleCache.get(vin);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  console.log(`Fetching status for ${vin} (Refresh: ${refresh})...`);

  try {
    // Always force refresh for now - cached status seems to return undefined
    // This makes the first request slower but ensures we get data
    console.log('Calling vehicle.status with refresh=true...');
    const statusRaw = await vehicle.status({ refresh: true });
    console.log('Raw status response:', JSON.stringify(statusRaw, null, 2));

    if (!statusRaw) {
      console.error('BlueLinky returned undefined for status');
      return res.status(500).json({
        error: 'Vehicle did not return status data',
        hint: 'Your vehicle may not support remote status queries, or BlueLink remote features may not be activated on your account'
      });
    }

    const formatted = mapToAppStatus(statusRaw);
    res.json(formatted);
  } catch (error) {
    console.error('Status fetch error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get Location
app.get('/api/vehicles/:vin/location', async (req, res) => {
  const { vin } = req.params;
  const vehicle = vehicleCache.get(vin);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  try {
    const loc = await vehicle.location();
    // Format: { latitude, longitude, altitude, speed, heading }
    res.json({
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: 'Location Received', // Reverse geocoding would happen here if needed
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Location error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vehicle Actions
const createActionHandler = (actionName) => async (req, res) => {
  const { vin } = req.params;
  const vehicle = vehicleCache.get(vin);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  console.log(`Executing ${actionName} on ${vin}...`);

  try {
    let result;
    if (actionName === 'lock') result = await vehicle.lock();
    if (actionName === 'unlock') result = await vehicle.unlock();
    if (actionName === 'start') {
       // Default start config
       const config = req.body || { airCtrl: true, duration: 10 };
       result = await vehicle.start(config);
    }
    if (actionName === 'stop') result = await vehicle.stop();

    res.json({ success: true, result });
  } catch (error) {
    console.error(`Action ${actionName} failed:`, error);
    res.status(500).json({ error: error.message });
  }
};

app.post('/api/vehicles/:vin/lock', createActionHandler('lock'));
app.post('/api/vehicles/:vin/unlock', createActionHandler('unlock'));
app.post('/api/vehicles/:vin/start', createActionHandler('start'));
app.post('/api/vehicles/:vin/stop', createActionHandler('stop'));

app.listen(PORT, () => {
  console.log(`\n--- BlueConnect Backend Running ---`);
  console.log(`Server listening on port ${PORT}`);
});