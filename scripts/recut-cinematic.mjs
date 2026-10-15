import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { composeTrack } from '../src/musicBank.ts';

const out=resolve(import.meta.dirname,'../trailer-output');
const source=join(out,'stonktrooper-trailer-cinematic.mp4');
const original=JSON.parse(readFileSync(join(out,'capture-report-cinematic.json'),'utf8'));
let cursor=0;
const shots=original.report.slice(0,-1).map((s,i)=>{
  const duration=i===0?1.5:i===8?1: i>=13?2:1.75;
  const shot={name:s.name,source:s.startFrame/30+(i?0.2:0),duration,start:cursor};
  cursor+=duration;return shot;
});
const seconds=cursor+4,rate=48000,data=new Float32Array(Math.ceil(seconds*rate));
let seed=7193;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function note(t,d,f,vol,wave='triangle',end=f){
  let phase=0,low=0;const start=Math.round(t*rate),n=Math.round(d*rate);
  for(let j=0;j<n&&start+j<data.length;j++){
    const p=j/n,x=j/rate;phase+=2*Math.PI*f*Math.pow(end/f,p)/rate;
    low=low*0.55+noise()*0.45;
    const v=wave==='noise'?low:wave==='sine'?Math.sin(phase):2/Math.PI*Math.asin(Math.sin(phase));
    data[start+j]+=v*vol*Math.min(1,x/0.009)*Math.exp(-p*5);
  }
}
const sections=[{start:0,end:shots[9].start,mode:'normal'},
  {start:shots[9].start,end:shots[12].start,mode:'pigeon'},
  {start:shots[12].start,end:shots[13].start,mode:'hawk'},
  {start:shots[13].start,end:cursor,mode:'kangaroo'}];
for(const section of sections){
  const track=composeTrack(section.mode,0);let t=section.start,step=0;
  while(t<section.end){
    const i=step%128,lead=track.melody[i];
    // Same composition, default timbres, swing and relative levels as audio.ts.
    if(lead){note(t,0.42,lead,0.012);note(t,0.13,lead*2.003,0.0025,'sine');}
    if(track.bass[i])note(t,0.28,track.bass[i],0.045);
    for(const f of track.chords[i])note(t,0.55,f,0.009);
    if(track.rhythm[i]&1)note(t,0.12,100,0.035,'sine',35);
    if(track.rhythm[i]&2)note(t,0.09,1100,0.014,'noise');
    if(track.rhythm[i]&4)note(t,0.03,3300,0.004,'noise');
    t+=30/track.bpm*(step%2===0?1.12:0.88);step++;
  }
}
for(const f of [98,146.83,196,293.66])note(cursor,3.5,f,0.016);
const pcm=Buffer.alloc(data.length*2);
for(let i=0;i<data.length;i++)pcm.writeInt16LE(Math.round(Math.tanh(data[i]*7)*30000*Math.min(1,i/(rate*0.1),(data.length-i)/(rate*0.8))),i*2);
const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
writeFileSync(join(out,'recut-game-music.wav'),Buffer.concat([h,pcm]));
writeFileSync(join(out,'recut-url.txt'),'https://www.stonktrooper.lol/');
const font="fontfile='C\\:/Windows/Fonts/arialbi.ttf'";
const style=`${font}:fontcolor=white:shadowcolor=black@0.85:shadowx=5:shadowy=6`;
const filters=shots.map((s,i)=>`[0:v]trim=start=${s.source}:duration=${s.duration},setpts=PTS-STARTPTS,fps=30,setsar=1[v${i}]`);
filters.push(`color=c=0x0c111b:s=1920x1080:r=30:d=4,drawbox=x=810:y=330:w=300:h=5:color=0x38bdf8:t=fill,drawtext=${style}:text='Play':fontsize=158:x=(w-tw)/2:y=390,drawtext=${style}:text='at':fontsize=62:x=(w-tw)/2:y=575,drawtext=${style}:textfile=recut-url.txt:fontsize=65:x=(w-tw)/2:y=685,fade=t=in:d=0.3,fade=t=out:st=3.5:d=0.5[end]`);
filters.push(shots.map((_,i)=>`[v${i}]`).join('')+`[end]concat=n=${shots.length+1}:v=1:a=0[video]`);
writeFileSync(join(out,'recut-filter.txt'),filters.join(';\n'));
const target=join(out,'stonktrooper-trailer-cinematic-recut.mp4');
const r=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-i',join(out,'recut-game-music.wav'),'-filter_complex',filters.join(';'),'-map','[video]','-map','1:a','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-t',String(seconds),target],{cwd:out,encoding:'utf8'});
if(r.status!==0)throw Error(r.stderr);
writeFileSync(join(out,'recut-report.json'),JSON.stringify({source,target,seconds,shots,audio:'Game composeTrack melodies, bass, chords and rhythm; offline synthesis following default playback. Not live audio recording.'},null,2));
console.log(target+' — '+seconds+' seconds');