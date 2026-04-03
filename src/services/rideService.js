import AsyncStorage from '@react-native-async-storage/async-storage';

class RideService {
  constructor() {
    this.useBackend = false; // Set to true when backend ready
  }

  async getRideHistory() {
    try {
      const ridesJson = await AsyncStorage.getItem('@kabaza_rides');
      return ridesJson ? JSON.parse(ridesJson) : [];
    } catch (error) {
      console.error('Error loading rides:', error);
      return [];
    }
  }

  async saveRide(rideData) {
    try {
      const rides = await this.getRideHistory();
      const newRide = {
        id: Date.now().toString(),
        ...rideData,
        createdAt: new Date().toISOString(),
      };
      rides.unshift(newRide);
      await AsyncStorage.setItem('@kabaza_rides', JSON.stringify(rides));
      return newRide;
    } catch (error) {
      console.error('Error saving ride:', error);
      return null;
    }
  }

  async getRideById(rideId) {
    const rides = await this.getRideHistory();
    return rides.find(ride => ride.id === rideId);
  }

  async repeatRide(rideId) {
    const ride = await this.getRideById(rideId);
    if (!ride) return null;
    
    return {
      destination: ride.destination,
      destinationCoordinates: ride.destinationCoordinates,
      pickupLocation: ride.pickup,
      pickupCoordinates: ride.pickupCoordinates,
      rideType: ride.vehicleType,
    };
  }
}

export default new RideService();