// src/hooks/index.js
export * from './useRedux';
export * from './useLocation';
export * from './useSocket';
export * from './useRide';
export * from './useAuth';
export * from './usePermissions';


// Default exports
export { default as useRedux } from './useRedux';
export { default as useLocation } from './useLocation';
export { default as useAuth } from './useAuth';

// Specific use cases
export { useRiderLocation, useDriverLocation } from './useLocation';
export { useRiderAuth, useDriverAuth } from './useAuth';