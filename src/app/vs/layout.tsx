'use client';

import { GameSocketContext, useGameSocketProvider } from '@/lib/game/useGameSocket';

export default function VSLayout({ children }: { children: React.ReactNode }) {
  const socketState = useGameSocketProvider();

  return (
    <GameSocketContext.Provider value={socketState}>
      {children}
    </GameSocketContext.Provider>
  );
}
