// Two fixed-length fabric sections suspended from the knot. The lower blade
// lags behind the upper section; airflow follows vertical speed continuously.
export function profileTiePose(phase: number, airborne = false, velocity = 0, airflow = 0) {
  const wind=airborne?Math.tanh(velocity/10)*.22:0;
  const drag=Math.tanh(airflow/6);
  const upperAngle=.07+Math.sin(phase-.4)*(.045+drag*.08)+wind-drag*1.5;
  const lowerAngle=.07+Math.sin(phase-1)*(.09+drag*.12)+wind*1.5-drag*1.65;
  const root={x:5.6,y:-31.4};
  // Original mounted silhouette trails roughly 33 units behind the knot.
  // Airflow is supplied only by riding callers; walking is subtly shorter.
  const segmentLength=airflow>0?16.5:5.5;
  const middle={x:root.x+Math.sin(upperAngle)*segmentLength,y:root.y+Math.cos(upperAngle)*segmentLength};
  const tip={x:middle.x+Math.sin(lowerAngle)*segmentLength,y:middle.y+Math.cos(lowerAngle)*segmentLength};
  return {root,middle,tip,upperAngle,lowerAngle};
}