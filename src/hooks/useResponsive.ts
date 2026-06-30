import { useState, useEffect } from 'react';
import { responsivityService, ResponsiveConfig, ScreenSize } from '../lib/responsivityService';

export const useResponsive = () => {
  const [config, setConfig] = useState<ResponsiveConfig>(responsivityService.getCurrentConfig());
  const [screen, setScreen] = useState<ScreenSize>(responsivityService.getCurrentScreen());
  
  useEffect(() => {
    const unsubscribe = responsivityService.subscribe((newConfig) => {
      setConfig(newConfig);
      setScreen(responsivityService.getCurrentScreen());
    });
    
    return unsubscribe;
  }, []);
  
  return {
    config,
    screen,
    isMobile: responsivityService.isMobile(),
    isTablet: responsivityService.isTablet(),
    isDesktop: responsivityService.isDesktop(),
    isPortrait: responsivityService.isPortrait(),
    isLandscape: responsivityService.isLandscape(),
    forceUpdate: () => responsivityService.forceUpdate()
  };
};
