import assert from 'node:assert/strict';
import {actionArmPose,runnerCarryPose,runnerBagThrowPose} from '../src/characterPose.ts';
import {PROFILE_ANATOMY} from '../src/profileAnatomy.ts';
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function check(arm){
  assert.ok(Math.abs(length(arm.shoulder,arm.elbow)-PROFILE_ANATOMY.upperArm)<1e-8,'Upper arm retains runner anatomy');
  assert.ok(Math.abs(length(arm.elbow,arm.hand)-PROFILE_ANATOMY.forearm)<1e-8,'Forearm retains runner anatomy');
}
for(const front of [false,true])for(let x=-30;x<=30;x+=3)for(let y=-80;y<=0;y+=4)check(actionArmPose(front,{x,y}));
for(let frame=0;frame<240;frame++)for(const kind of ['bag','diamond']) {
  const p=runnerCarryPose(kind,frame/30);check(p.near);check(p.far);
  if(kind==='diamond') {
    assert.ok(Math.abs(p.asset.y+p.asset.scale*14.4-p.near.hand.y)<.1,'Diamond tip rests on the palm');
    assert.ok(p.asset.y<-55&&Math.abs(p.asset.x-3)<.1,'Diamond is centered above the head, not in front of the face');
    assert.ok(p.near.hand.y<=-46&&p.far.hand.y<=-46,'Both arms are raised above the head center');
  }
  else assert.ok(Math.abs(p.asset.y-p.asset.scale*6-p.near.hand.y)<.1,'Bag cord rests in the palm');
}
for(const direction of [-1,1])for(let timer=0;timer<=16;timer+=.1) {
  const p=runnerBagThrowPose(timer,direction);check(p.near);
  assert.ok(Math.abs(p.asset.y-4.5-p.near.hand.y)<1e-8,'Thrown bag windup follows the actual hand');
}
console.log('PASS fixed-length action arms, diamond/bag palm contact and both bag throw directions');