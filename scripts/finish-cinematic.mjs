// Offline, dependency-free scoring/mixing fallback. No browser audio rendering.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const out=resolve(import.meta.dirname,'../trailer-output');
const edit=JSON.parse(readFileSync(join(out,'cinematic-edit.json'),'utf8'));
const rate=48000, length=Math.round(edit.seconds*rate);
const left=new Float32Array(length),right=new Float32Array(length);
let seed=91471;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function voice(t,duration,frequency,volume,{end=frequency,noise=0,pan=0,attack=0.008,sustain=false,instrument='sine'}={}){
  const start=Math.round(t*rate),n=Math.round(duration*rate);let phase=0,filtered=0;
  for(let j=0;j<n;j++){
    const i=start+j;if(i<0||i>=length)continue;
    const p=j/n,x=j/rate,f=frequency*Math.pow(end/Math.max(1,frequency),p);
    phase+=2*Math.PI*f/rate;filtered=filtered*0.65+random()*0.35;
    const envelope=Math.min(1,x/attack)*(sustain?Math.sin(Math.PI*p):Math.exp(-p*6));
    const tone=instrument==='keys'?Math.sin(phase)+0.35*Math.sin(phase*2)*Math.exp(-p*4)+0.12*Math.sin(phase*3):instrument==='bass'?Math.sin(phase)+0.25*Math.sin(phase*2):instrument==='pluck'?Math.sin(phase)+0.3*Math.sin(phase*3)*Math.exp(-p*8):Math.sin(phase);
    const value=(tone*(1-noise)+filtered*noise*2)*volume*envelope;
    left[i]+=value*Math.sqrt((1-pan)/2);right[i]+=value*Math.sqrt((1+pan)/2);
  }
}
const finale=edit.report.find(c=>c.name==='Kangaroo duel').startFrame/30;
const ending=edit.report.at(-1).startFrame/30;
// 120 BPM dance-pop instrumental: four-on-the-floor, syncopated keys,
// a recurring eight-bar hook, walking octave bass, and scene-based breakdowns.
const midi = n => 440 * 2 ** ((n - 69) / 12);
const chords = [[45,60,64,67],[41,60,65,69],[48,60,64,67],[43,59,62,67]];
const stepTime=0.125;
const hook=[76,0,79,81,0,79,76,74,72,0,74,76,0,72,71,74,76,0,79,84,0,81,79,76,74,0,76,79,0,76,74,72];
for(let step=0;step*stepTime<edit.seconds-0.7;step++){
  const t=step*stepTime,chord=chords[Math.floor(step/16)%4];
  const scene=edit.report.find(c=>t>=c.startFrame/30&&t<(c.startFrame+c.frames)/30);
  const breakdown=/Pigeon twisting|Inverted/.test(scene?.name??'');
  const power=t<2.5?0.55:breakdown?0.65:1;
  if([0,3,6,10,14].includes(step%16))for(const [k,pitch] of chord.slice(1).entries())voice(t,0.38,midi(pitch),0.11*power,{pan:(k-1)*0.45,instrument:'keys'});
  if(step%2===0)voice(t,0.21,midi(chord[0]+(step%8===6?12:0)),0.24*power,{instrument:'bass'});
  const pitch=hook[Math.floor(step/2)%hook.length];
  if(step%2===0&&pitch&&t>1)voice(t,0.28,midi(pitch),0.15*power,{pan:0.15,instrument:'pluck'});
  if(step%4===0&&!breakdown)voice(t,0.2,145,0.48*power,{end:38});
  if(step%8===4&&!breakdown){voice(t,0.12,180,0.12);voice(t,0.13,2400,0.27,{noise:1});voice(t+0.018,0.1,1700,0.14,{noise:1});}
  if(step%4===2)voice(t,0.09,6500,0.14*power,{noise:1,pan:-0.4});
  if(step%2===1&&t>8)voice(t,0.035,7500,0.06,{noise:1,pan:0.5});
  if(t>finale&&step%16>=14)voice(t,0.08,2300,0.16,{noise:0.9});
}
for(const cut of edit.report){
  const t=cut.startFrame/30;if(!t)continue;
  // Musical chord stabs mark edits without covering the melody with sweeps.
  voice(t,0.19,120,0.2,{end:42});
  for(const p of [72,76,79])voice(t,0.35,midi(p),0.075,{instrument:'keys'});
  const duration=cut.frames/30;
  if(/chainsaw/.test(cut.name))voice(t+0.7,1.1,90,0.26,{noise:0.65,end:145});
  if(/Whale riders/.test(cut.name))voice(t+0.6,1.1,380,0.22,{end:190});
  if(/rocket/.test(cut.name))voice(t+0.3,1.8,150,0.35,{end:900,noise:0.6,sustain:true});
  if(/Black Swan/.test(cut.name))voice(t+0.6,0.35,620,0.25,{end:280,noise:0.3});
  if(/Kangaroo/.test(cut.name))for(let d=0.35;d<duration;d+=0.6){voice(t+d,0.15,170,0.35,{end:55,noise:0.3});}
}
for(const [k,p] of [45,60,64,67,72].entries())voice(ending+2.5,2.4,midi(p),0.09,{pan:(k-2)*0.3,instrument:'keys'});
// Short stereo room tail and soft limiting, followed by measured normalization.
const pcm=Buffer.alloc(length*4);
for(let i=0;i<length;i++){
  const delay=i-Math.round(rate*0.16);
  const fade=Math.min(1,i/(rate*0.3),(length-i)/(rate*1.8));
  const l=Math.tanh((left[i]+(delay>=0?right[delay]*0.13:0))*1.2)*fade;
  const r=Math.tanh((right[i]+(delay>=0?left[delay]*0.13:0))*1.2)*fade;
  pcm.writeInt16LE(Math.round(l*30000),i*4);pcm.writeInt16LE(Math.round(r*30000),i*4+2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);
header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);
header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
const wav=join(out,'cinematic-mix.wav');writeFileSync(wav,Buffer.concat([header,pcm]));
if(!existsSync(join(out,'frames',String(Math.round(edit.seconds*30)-1).padStart(5,'0')+'.jpg')))throw Error('Incomplete capture');
const video=join(out,'stonktrooper-trailer-dance.mp4');
const result=spawnSync('ffmpeg',['-y','-v','error','-framerate','30','-i',join(out,'frames','%05d.jpg'),'-i',wav,'-vf','scale=1920:1080:flags=lanczos','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',video],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr);
writeFileSync(join(out,'capture-report-dance.json'),JSON.stringify({...edit,audio:'Original 120 BPM dance-pop instrumental, melodic hook, keys, octave bass, drums; scene-based breakdowns and action accents. Not live audio.',resolution:'1920x1080 (upscaled from 1280x720 capture)',directed:true},null,2));
console.log('Created '+video);