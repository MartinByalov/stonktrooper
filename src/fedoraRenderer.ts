// Projected 3D version of the tilted, broad-brimmed fedora above the logo's S.
// The brim retains its width while the pinched crown and contrasting band turn.
type Point = { x: number; y: number; z: number };

export function drawSpinningFedora(ctx: CanvasRenderingContext2D, angle: number, darkMode: boolean, colors?: readonly [string, string]): void {
  ctx.save();
  const project = ({ x, y, z }: Point) => {
    const horizontal = x * Math.cos(angle) + z * Math.sin(angle);
    // Keep enough depth visible at quarter turns so the hat does not read as
    // a flat card viewed from either side.
    const vertical = y + (-x * Math.sin(angle) + z * Math.cos(angle)) * 0.48;
    // The logo tips upward on the right rather than sitting perfectly level.
    return { x: horizontal * Math.cos(-0.12) - vertical * Math.sin(-0.12),
      y: horizontal * Math.sin(-0.12) + vertical * Math.cos(-0.12) };
  };
  const polygon = (points: Point[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, index) => {
      const p = project(point);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
  };
  const segments = 32;
  const ring = (i: number, rx: number, rz: number, y: number): Point => {
    const a = i * Math.PI * 2 / segments;
    return { x: Math.cos(a) * rx, y, z: Math.sin(a) * rz };
  };
  const front = (p: Point) => -p.x * Math.sin(angle) + p.z * Math.cos(angle) > 0;
  const brimTop = colors?.[0] ?? (darkMode ? '#f8fafc' : '#111318');
  const brimEdge = colors?.[0] ?? (darkMode ? '#cbd5e1' : '#080a0e');
  const crown = colors ? [colors[0],colors[0],colors[0]] : darkMode ? ['#ffffff', '#f8fafc', '#e2e8f0'] : ['#303239', '#17191d', '#080a0e'];
  const band = colors?.[1] ?? (darkMode ? '#111318' : '#ffffff');

  // Keep the flying weapon compact: the brim is short and the crown is rounded
  // so the silhouette reads as a fedora rather than a cowboy hat.
  for (let i = 0; i < segments; i++) {
    const a = ring(i, 18.5, 14.5, 4), b = ring(i + 1, 18.5, 14.5, 4);
    polygon([a, b, ring(i + 1, 10.3, 9.2, 3), ring(i, 10.3, 9.2, 3)], brimTop);
  }

  // A low, rounded crown avoids the tall pinched profile of a cowboy hat.
  const crownY = -8;
  // Back walls, then top, then front walls: the changing silhouette has depth.
  const walls = (near: boolean) => {
    for (let i = 0; i < segments; i++) {
      if (front(ring(i + 0.5, 11, 9.2, 0)) !== near) continue;
      const light = Math.cos((i + 0.5) * Math.PI * 2 / segments - angle);
      const shade = light > 0.35 ? crown[0] : light > -0.35 ? crown[1] : crown[2];
        polygon([ring(i, 10.3, 9.2, 3), ring(i + 1, 10.3, 9.2, 3), ring(i + 1, 8.5, 7.2, crownY), ring(i, 8.5, 7.2, crownY)], shade);
      // A contrasting band wraps the volume rather than facing the camera.
        polygon([ring(i, 10.4, 9.3, -1), ring(i + 1, 10.4, 9.3, -1),
          ring(i + 1, 10.1, 9.1, 3), ring(i, 10.1, 9.1, 3)], band);
    }
  };
  walls(false);
  const crownTop: Point[] = [];
  // Level crown rim; the visible height difference comes from projection and tilt.
  for (let i = 0; i < segments; i++) crownTop.push(ring(i, 8.5, 7.2, crownY));
  polygon(crownTop, colors?.[0] ?? (darkMode ? '#ffffff' : '#24262b'));
  // Recessed central dent follows the orientation of the crown.
  polygon([{ x: -5, y: crownY, z: -1 }, { x: 0, y: crownY + 4, z: -3 },
    { x: 5, y: crownY, z: -1 }, { x: 0, y: crownY + 1, z: 2 }], darkMode ? '#cbd5e1' : '#080a0e');
  walls(true);

  // Ribbon belongs to the near or far side depending on the rotation.
  const ribbon: Point = { x: 10, y: 0, z: 0 };
  if (front(ribbon)) {
    polygon([{ x: 10.2, y: -1, z: -2 }, { x: 12, y: -2, z: 0 },
      { x: 10.2, y: -1, z: 2 }, { x: 11, y: 2, z: 0 }], band);
  }
  for (let i = 0; i < segments; i++) {
    const outer = ring(i + 0.5, 18.5, 14.5, 4);
    if (!front(outer)) continue;
    polygon([ring(i, 18.5, 14.5, 4), ring(i + 1, 18.5, 14.5, 4),
      ring(i + 1, 18.5, 14.5, 6), ring(i, 18.5, 14.5, 6)], brimEdge);
  }
  ctx.restore();
}