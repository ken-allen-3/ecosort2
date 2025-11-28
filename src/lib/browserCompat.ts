/**
 * Browser compatibility utilities for EcoSort
 * Ensures the app works across all modern browsers (Chrome, Firefox, Safari, Edge)
 */

export const checkBrowserCompatibility = () => {
  const issues: string[] = [];
  
  // Check essential APIs
  if (!window.FileReader) {
    issues.push('FileReader API not supported');
  }
  
  if (!window.fetch) {
    issues.push('Fetch API not supported');
  }
  
  if (!window.Promise) {
    issues.push('Promise not supported');
  }
  
  return {
    isCompatible: issues.length === 0,
    issues
  };
};

export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let version = 'Unknown';
  
  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browserName = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browserName = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  }
  
  return { browserName, version, userAgent: ua };
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

export const isMobile = () => {
  return isIOS() || isAndroid() || /Mobile/.test(navigator.userAgent);
};

export const supportsGeolocation = () => {
  return 'geolocation' in navigator;
};

export const supportsFileAPI = () => {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
};

export const supportsCameraCapture = () => {
  // iOS Safari has limited support for capture attribute
  const ios = isIOS();
  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  
  return !ios || hasMediaDevices;
};
