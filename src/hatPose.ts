// Head-local units: the scalp contact lies at y=-7.
export function hatMetrics(id: string) {
  const kind=id.slice(5);
  // Profile artwork is scaled around y=-7 inside the hat renderers.
  // Use those final heights, not the unscaled construction coordinates.
  const top=kind==='cone'?-33.3:kind==='top'?-31:kind==='crown'?-29.6:
    kind==='christmas'?-28.1:kind==='tinfoil'?-26.1:kind==='propeller'?-25.7:
    kind==='paper'?-26.8:kind==='cowboy'?-23.4:kind==='cap'?-18.5:-18.8;
  const bottom=kind==='paper'?10.6:-4;
  // Hollow crowns nest over one another: the next brim overlaps the previous
  // crown instead of balancing on its highest pixel. Tall rigid hats nest less.
  // Top hats and hollow traffic cones slide deeply over the previous crown
  // instead of forming separate towers. Share this spacing across wearers.
  const nesting=['top','cone'].includes(kind)?.20:kind==='propeller'?.24:['crown','tinfoil'].includes(kind)?.60:.38;
  return {centerY:(top+bottom)/2,stackHeight:Math.max(5,(-7-top-1)*nesting)};
}

export function hatItemPose(id: string, phase: number) {
  const kind=id.slice(5);
  // Tall/soft hats rock without pretending their profile is a rotating 3D mesh.
  const amplitude=kind==='paper'?.08:kind==='christmas'?.13:
    ['cone','top','tinfoil','crown'].includes(kind)?.055:.09;
  return {angle:Math.sin(phase)*amplitude,bob:Math.sin(phase*2)*.65};
}

// Grip points in raw profile-artwork space, not in the head-contact mapping.
// Keep the crown outside the beak: a backwards cap needs the opposite facing.
export function hatBirdGrip(id: string, captain = false) {
  const kind=id.slice(5);
  if (captain) {
    return {x:22*.84,y:-7+.84,facing:1,part:'visor'};
  }
  if (kind==='cap') return {x:-1-23*.65,y:-7+1.5+.78,facing:-1,part:'visor'};
  if (kind==='propeller') return {x:24*.65,y:-7+2+2*.78,facing:1,part:'visor'};
  if (kind==='paper') return {x:12.5*.8,y:-7+15*1.1,facing:1,part:'rim'};
  if (kind==='christmas') return {x:13*.65,y:-7-2*.78,facing:1,part:'rim'};
  if (kind==='cone') return {x:17*.65,y:-7-.5*.78,facing:1,part:'rim'};
  if (kind==='tinfoil') return {x:13*.65,y:-7+2-1.7*.78,facing:1,part:'rim'};
  if (kind==='crown') {
    const x=12.68*Math.cos(.03)-.5, y=-7-12.68*Math.sin(.03);
    return {x:x*.78*.65,y:-7+(y+7)*.78,facing:1,part:'rim'};
  }
  if (kind==='top') return {x:19*Math.cos(.07)*.65,y:-7+(-1-19*Math.sin(.07))*.78,facing:1,part:'rim'};
  if (kind==='cowboy') return {x:23*.65,y:-7-4*.78,facing:1,part:'rim'};
  // Classic fedora and its colorways share a tilted elliptical brim.
  const x=20*.65, y=-1.2*.78;
  return {x:-.5+x*Math.cos(.08)+y*Math.sin(.08),y:-7-x*Math.sin(.08)+y*Math.cos(.08),facing:1,part:'rim'};
}