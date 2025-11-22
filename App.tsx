import React, { useState } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import BlueLinkyClient, { BlueLinkyVehicle } from './services/vehicleService';

const App: React.FC = () => {
  const [vehicle, setVehicle] = useState<BlueLinkyVehicle | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: string, password: string, pin: string) => {
    setLoading(true);
    try {
      // Initialize the adapter client with real credentials
      const client = new BlueLinkyClient({
        username: email,
        password: password,
        pin: pin,
        region: 'US'
      });

      await client.login();
      
      // Fetch vehicles immediately after login
      const vehicles = await client.getVehicles();
      
      if (vehicles.length > 0) {
        setVehicle(vehicles[0]);
      } else {
        alert("No vehicles found on this account.");
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error; // Propagate to form for error display
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setVehicle(null);
  };

  return (
    <>
      {vehicle ? (
        <Dashboard vehicleController={vehicle} onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;