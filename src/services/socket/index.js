// src/services/socket/index.js

// Core socket service (main entry)
export { default as socketService } from './socketService';

// API-level abstraction
export { default as SocketAPIService } from './SocketAPIService';

// Connection lifecycle manager
export { default as ConnectionManager } from './ConnectionManager';

// Event constants (VERY important)
export { SocketEvents } from './EventTypes';

// Realtime helpers (location, ride updates, etc.)
export * from './realtimeUpdates';
