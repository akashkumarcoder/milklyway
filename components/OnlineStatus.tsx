import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";

const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium gap-1",
        isOnline 
          ? "bg-green-50 text-green-700" 
          : "bg-yellow-50 text-yellow-700"
      )}
    >
      {isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );
};

export default OnlineStatus;