'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('universe');
const ctx = canvas.getContext('2d', {alpha:false});
const defaults = {mode:'fireflies',palette:'ember',count:1100,speed:100,turbulence:65,trail:79,glow:100,pointer:true};
const settings = {...defaults};
const palettes = {ember:[32,39,46],arctic:[185,200,216],violet:[255,272,292],forest:[130,151,171],prism:[20,120,210,285]};
const labels = {fireflies:'MEADOW',nebula:'NEBULA',aurora:'AURORA',vortex:'VORTEX',ocean:'ABYSS'};
const particles = [];
let width=0,height=0,dpr=1,last=0,elapsed=0,frames=0,fpsTime=0,paused=false,raf=0;
let pointer={x:0,y:0,active:false};
let analyser=null,audioContext=null,audioSource=null,microphone=null,audioData=null,objectURL=null,level=0;
const random=(a,b)=>a+Math.random()*(b-a);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function resize(){
 const oldW=width,oldH=height;
 width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#060b13';ctx.fillRect(0,0,width,height);
 if(oldW&&oldH)for(const p of particles){p.x=p.x/oldW*width;p.y=p.y/oldH*height;}
}
function particle(){return {x:random(0,width),y:random(0,height),vx:random(-.3,.3),vy:random(-.3,.3),size:random(.5,2.2),phase:random(0,Math.PI*2),frequency:random(.6,2),hue:Math.random(),age:random(0,500),seed:random(0,1000),orbit:random(.2,1.5)};}
function reconcile(){while(particles.length<settings.count)particles.push(particle());if(particles.length>settings.count)particles.length=settings.count;$('particles').textContent=particles.length.toLocaleString();}
function color(p,t,alpha){const spectrum=palettes[settings.palette];const position=p.hue*spectrum.length;const i=Math.floor(position)%spectrum.length;const j=(i+1)%spectrum.length;const hue=(spectrum[i]+(spectrum[j]-spectrum[i])*(position%1)+Math.sin(t*.13+p.seed)*5+360)%360;return `hsla(${hue},${settings.palette==='ember'?85:88}%,${clamp(58+Math.sin(p.phase+t*p.frequency)*15,35,90)}%,${alpha})`;}
function motion(p,t,dt){
 const nx=p.x/Math.max(width,1)-.5,ny=p.y/Math.max(height,1)-.5;
 const noise=Math.sin(nx*9+t*.17+p.seed)*Math.cos(ny*8-t*.12+p.seed*.37);
 const swirl=Math.sin(p.x*.005+p.seed+t*.21)+Math.cos(p.y*.006-p.seed+t*.18);
 let ax=0,ay=0;
 switch(settings.mode){
 case 'fireflies':ax=Math.cos(p.phase+t*.65)*.11+noise*.08;ay=Math.sin(p.phase*1.3+t*.43)*.11+swirl*.035;break;
 case 'nebula':ax=Math.cos(ny*8+t*.22+noise*2)*.19;ay=Math.sin(nx*9-t*.18+swirl)*.15;break;
 case 'aurora':ax=Math.sin(p.y*.009+t*.35+noise)*.22+.08;ay=Math.cos(p.x*.006-t*.26+swirl)*.1;break;
 case 'vortex':{const dx=p.x-width*.5,dy=p.y-height*.5;const dist=Math.hypot(dx,dy)+35;const spin=.22*Math.min(1,dist/150);ax=-dy/dist*spin-dx/dist*.025;ay=dx/dist*spin-dy/dist*.025;break;}
 case 'ocean':ax=Math.sin(p.y*.012+t*.28+p.seed)*.12;ay=-.065+Math.cos(p.x*.011+t*.19)*.07;break;
 }
 const turbulence=settings.turbulence/100;
 ax+=(noise+Math.sin(p.seed+t*1.7))*.09*turbulence;
 ay+=(swirl+Math.cos(p.seed+t*1.3))*.065*turbulence;
 if(settings.pointer&&pointer.active){const dx=pointer.x-p.x,dy=pointer.y-p.y,r2=dx*dx+dy*dy+5000;const force=Math.min(.3,900/r2);ax+=dx/Math.sqrt(r2)*force;ay+=dy/Math.sqrt(r2)*force;}
 const step=Math.min(dt*60,2.5),velocity=settings.speed/100*(1+level*.65);
 p.vx=clamp((p.vx+ax*step)*.985,-2.6,2.6);p.vy=clamp((p.vy+ay*step)*.985,-2.6,2.6);
 p.x+=p.vx*step*velocity;p.y+=p.vy*step*velocity;
 const margin=30;
 if(p.x < -margin)p.x=width+margin;else if(p.x>width+margin)p.x=-margin;
 if(p.y < -margin)p.y=height+margin;else if(p.y>height+margin)p.y=-margin;
 p.age+=step;
}
function backdrop(){const fade=clamp(1-settings.trail/100,.02,1);ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(6,11,19,${fade})`;ctx.fillRect(0,0,width,height);}
function render(dt){
 elapsed+=dt;backdrop();ctx.globalCompositeOperation='lighter';
 const luminosity=settings.glow/100;
 for(const p of particles){motion(p,elapsed,dt);const pulse=.52+.48*Math.sin(elapsed*p.frequency*2+p.phase);const radius=p.size*(.7+pulse*.7)*(1+level*.8);const alpha=clamp((.16+pulse*.6)*luminosity,.03,.95);
 if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
 if(radius>1){ctx.fillStyle=color(p,elapsed,alpha*.08);ctx.beginPath();ctx.arc(p.x,p.y,radius*5,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle=color(p,elapsed,alpha);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.4,radius),0,Math.PI*2);ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
}
function audioLevel(){if(!analyser)return 0;analyser.getByteFrequencyData(audioData);let sum=0;const n=Math.min(90,audioData.length);for(let i=2;i<n;i++)sum+=audioData[i];return clamp(sum/Math.max(1,n-2)/180,0,1.5);}
function loop(now){raf=requestAnimationFrame(loop);if(!last)last=now;const dt=clamp((now-last)/1000,0,.05);last=now;if(paused)return;level+=(audioLevel()-level)*.12;render(dt);frames++;fpsTime+=dt;if(fpsTime>=.7){$('fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}}
function refresh(){for(const key of ['mode','palette','count','speed','turbulence','trail','glow','pointer']){$(key).value=key==='pointer'?undefined:settings[key];if(key==='pointer')$(key).checked=settings.pointer;}
 for(const key of ['count','speed','turbulence','trail','glow'])$(key+'Val').textContent=key==='count'?settings[key].toLocaleString():settings[key]+'%';
 $('field').textContent=labels[settings.mode];reconcile();}
function message(s){$('message').textContent=s;}
function apply(input){for(const key of Object.keys(defaults))if(Object.prototype.hasOwnProperty.call(input,key)){const value=input[key];if(typeof value===typeof defaults[key])settings[key]=value;}refresh();}
async function api(method,body){const options={method,headers:{Accept:'application/json'}};if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}const response=await fetch('api.php',options);const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Server error');return data;}
function snapshot(){const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=`firefly-${settings.mode}-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;link.click();message('Frame captured as PNG.');}
function toggle(){paused=!paused;$('toggle').textContent=paused?'▶   Resume simulation':'Ⅱ   Pause simulation';$('status').textContent=paused?'SIMULATION PAUSED':'SIMULATION ONLINE';last=0;}
async function stopAudio(){if(microphone){microphone.getTracks().forEach(t=>t.stop());microphone=null;}if(audioSource){try{audioSource.disconnect();}catch{ }audioSource=null;}if(audioContext){await audioContext.close().catch(()=>{});audioContext=null;}analyser=null;audioData=null;level=0;const player=$('player');player.pause();player.removeAttribute('src');player.hidden=true;if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;} $('audioState').textContent='off';}
async function connectAudio(source){await stopAudio();audioContext=new (window.AudioContext||window.webkitAudioContext)();analyser=audioContext.createAnalyser();analyser.fftSize=256;audioData=new Uint8Array(analyser.frequencyBinCount);
 if(source==='mic'){microphone=await navigator.mediaDevices.getUserMedia({audio:true});audioSource=audioContext.createMediaStreamSource(microphone);audioSource.connect(analyser);$('audioState').textContent='microphone';}
 else {const player=$('player');objectURL=URL.createObjectURL(source);player.src=objectURL;player.hidden=false;audioSource=audioContext.createMediaElementSource(player);audioSource.connect(analyser);analyser.connect(audioContext.destination);await player.play();$('audioState').textContent='file';}
 await audioContext.resume();$('audio').checked=true;message('Audio reactivity enabled.');}
for(const key of ['mode','palette','count','speed','turbulence','trail','glow','pointer'])$(key).addEventListener('input',e=>{settings[key]=key==='pointer'?e.target.checked:['mode','palette'].includes(key)?e.target.value:Number(e.target.value);refresh();});
$('toggle').addEventListener('click',toggle);$('snapshot').addEventListener('click',snapshot);
$('reset').addEventListener('click',()=>{apply(defaults);message('Default field restored.');});
$('save').addEventListener('click',async()=>{try{await api('POST',settings);message('Preset saved on the server.');}catch(e){message('Save failed: '+e.message);}});
$('load').addEventListener('click',async()=>{try{const data=await api('GET');apply(data.preset);message(data.saved?'Saved preset loaded.':'No saved preset; defaults loaded.');}catch(e){message('Load failed: '+e.message);}});
$('collapse').addEventListener('click',()=>{document.body.classList.toggle('collapsed');$('collapse').textContent=document.body.classList.contains('collapsed')?'+':'−';});
$('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(e=>message(e.message));});
$('audio').addEventListener('change',async e=>{if(!e.target.checked){await stopAudio();message('Audio reactivity disabled.');}else{message('Choose Microphone or Audio file to activate audio.');}});
$('mic').addEventListener('click',async()=>{try{await connectAudio('mic');}catch(e){await stopAudio();$('audio').checked=false;message('Microphone unavailable: '+e.message);}});
$('audioFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{await connectAudio(file);}catch(err){await stopAudio();$('audio').checked=false;message('Audio unavailable: '+err.message);}e.target.value='';});
canvas.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY,active:true};});canvas.addEventListener('pointerleave',()=>{pointer.active=false;});
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();toggle();}else if(e.key.toLowerCase()==='s')snapshot();else if(e.key.toLowerCase()==='f')$('fullscreen').click();});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=0;});
setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});},10000);
resize();refresh();$('clock').textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});raf=requestAnimationFrame(loop);
})();
