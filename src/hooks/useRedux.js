// src/hooks/useRedux.js
import { useDispatch, useSelector } from 'react-redux';

// Auth hooks
export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  
  return {
    ...auth,
    // Add any derived state or helper functions here
    isDriver: auth.user?.role === 'driver',
    isRider: auth.user?.role === 'rider',
  };
};

// App hooks
export const useApp = () => {
  const dispatch = useDispatch();
  const app = useSelector((state) => state.app);
  
  return {
    ...app,
    // Helper functions can be added here
  };
};

// Driver hooks
export const useDriver = () => {
  const dispatch = useDispatch();
  const driver = useSelector((state) => state.driver);
  
  return {
    ...driver,
    // Helper functions for driver state
    hasActiveRide: !!driver.currentRide,
    hasRideRequests: driver.rideRequests.length > 0,
  };
};