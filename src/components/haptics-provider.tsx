'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useWebHaptics } from 'web-haptics/react';

type HapticsContextType = {
  trigger: (input?: string | number | number[]) => Promise<void> | undefined;
  isSupported: boolean;
};

const HapticsContext = createContext<HapticsContextType>({
  trigger: async () => {},
  isSupported: false,
});

export function useHaptics() {
  return useContext(HapticsContext);
}

export function HapticsProvider({ children }: { children: ReactNode }) {
  const { trigger, isSupported } = useWebHaptics();
  
  return (
    <HapticsContext.Provider value={{ trigger: trigger as (input?: string | number | number[]) => Promise<void> | undefined, isSupported }}>
      {children}
    </HapticsContext.Provider>
  );
}
