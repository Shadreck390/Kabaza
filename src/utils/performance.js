// src/utils/performance.js
import { InteractionManager } from 'react-native';

// Debounce function for performance optimization
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for performance optimization
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Run after interactions for better performance
export const runAfterInteractions = (func) => {
  InteractionManager.runAfterInteractions(() => {
    func();
  });
};

// Memoization helper
export const memoize = (func) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
};

// Performance measurement
export const measurePerformance = (func, label = 'Function') => {
  const startTime = performance.now();
  const result = func();
  const endTime = performance.now();
  
  console.log(`⏱️ ${label} took ${endTime - startTime}ms`);
  return result;
};

// Batch updates for better performance
export const batchUpdates = (updates, delay = 16) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      updates.forEach(update => update());
      resolve();
    }, delay);
  });
};

// Optimize heavy computations
export const optimizeComputation = (computation, threshold = 1000) => {
  return new Promise((resolve) => {
    if (computation.length > threshold) {
      // Split computation for better performance
      const chunks = [];
      for (let i = 0; i < computation.length; i += threshold) {
        chunks.push(computation.slice(i, i + threshold));
      }
      
      const processChunk = (chunkIndex) => {
        if (chunkIndex >= chunks.length) {
          resolve();
          return;
        }
        
        requestAnimationFrame(() => {
          computation(chunks[chunkIndex]);
          processChunk(chunkIndex + 1);
        });
      };
      
      processChunk(0);
    } else {
      computation();
      resolve();
    }
  });
};

// Memory management
export const clearMemoryCache = () => {
  if (global.gc) {
    global.gc();
  }
  
  // Clear any caches
  if (typeof Image !== 'undefined') {
    Image.prefetch = () => Promise.resolve();
  }
};

// Network request optimization
export const optimizeNetworkRequests = (requests, maxConcurrent = 3) => {
  return new Promise((resolve) => {
    const results = [];
    let currentIndex = 0;
    let activeCount = 0;
    
    const processNext = () => {
      while (activeCount < maxConcurrent && currentIndex < requests.length) {
        const requestIndex = currentIndex++;
        activeCount++;
        
        requests[requestIndex]()
          .then(result => {
            results[requestIndex] = result;
          })
          .catch(error => {
            results[requestIndex] = { error };
          })
          .finally(() => {
            activeCount--;
            processNext();
            
            if (activeCount === 0 && currentIndex >= requests.length) {
              resolve(results);
            }
          });
      }
    };
    
    processNext();
  });
};

// Render optimization for lists
export const optimizeListRender = (data, chunkSize = 10) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
};

// Lazy loading helper
export const lazyLoad = (importFunc, fallback = null) => {
  return React.lazy(() => importFunc().catch(() => ({ default: () => fallback })));
};