import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { loadPlayerAvatar } from './playerServices';

export function PlayerAvatar({ uri }: { uri?: string }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    setImage('');
    if (uri) void loadPlayerAvatar(uri).then(value => { if (active) setImage(value); }).catch(() => {});
    return () => { active = false; };
  }, [uri]);
  return image ? <img className="player-avatar-image" src={image} alt="" onError={() => setImage('')} /> : <UserRound size={18} />;
}