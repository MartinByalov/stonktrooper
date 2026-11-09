import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { useEffect, useState } from 'react';

interface DeviceVolumeBridge {
  getVolume(): Promise<{ volume: number }>;
  setVolume(options: { volume: number }): Promise<{ volume: number }>;
  addListener(event: 'volumeChanged', listener: (value: { volume: number }) => void): Promise<PluginListenerHandle>;
}

const bridge = registerPlugin<DeviceVolumeBridge>('DeviceVolume');
export const usesDeviceVolume = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('DeviceVolume');

export function useDeviceVolume() {
  const [volume, setVolume] = useState<number | null>(null);
  useEffect(() => {
    if (!usesDeviceVolume()) return;
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    const update = (value: { volume: number }) => { if (!disposed) setVolume(value.volume); };
    void (async () => {
      const handle = await bridge.addListener('volumeChanged', update);
      if (disposed) { await handle.remove(); return; }
      listener = handle;
      update(await bridge.getVolume());
    })().catch(error => console.warn('Device volume unavailable', error));
    return () => { disposed = true; void listener?.remove(); };
  }, []);
  const changeVolume = (value: number) => {
    void bridge.setVolume({ volume: Math.max(0, Math.min(100, value)) })
      .then(result => setVolume(result.volume))
      .catch(error => console.warn('Could not change device volume', error));
  };
  return { volume, changeVolume };
}