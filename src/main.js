import "./style.css";

const app=document.querySelector("#app");
app.innerHTML=`
<div class="shell">
<header class="topbar"><div><div class="eyebrow">LOCAL CHART ANALYSIS</div><h1>AI Chart Scanner <span>PRO</span></h1></div><div class="status"><i></i> Browser-only • No API key</div></header>
<main class="layout">
<section class="workspace"><div class="toolbar">
<label class="upload"><input id="fileInput" type="file" accept="image/*"><span>Upload chart</span></label>
<button id="analyseBtn" class="primary" disabled>Analyse chart</button><button id="clearBtn">Clear</button><button id="downloadBtn" disabled>Save annotated chart</button>
</div>
<div class="canvas-card"><canvas id="chartCanvas"></canvas><div id="emptyState" class="empty"><div class="empty-icon">+</div><h2>Drop a chart screenshot here</h2><p>PNG, JPG or WEBP. Analysis stays in this browser.</p></div></div>
<div class="legend"><span><b class="dot long"></b>Long zone</span><span><b class="dot short"></b>Short zone</span><span><b class="line entry"></b>Entry</span><span><b class="line tp"></b>Target</span><span><b class="line sl"></b>Stop</span></div>
</section>
<aside class="panel"><div class="panel-title"><div><div class="eyebrow">SCANNER</div><h2>Analysis</h2></div><div id="signalBadge" class="badge neutral">WAIT</div></div>
<div class="controls"><label>Timeframe<select id="timeframe"><option>5M</option><option>15M</option><option selected>30M</option><option>1H</option><option>4H</option></select></label>
<label>Bias<select id="bias"><option value="auto" selected>Auto</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option></select></label>
<label>Minimum setup score<input id="threshold" type="range" min="50" max="90" value="70"><span id="thresholdValue">70%</span></label></div>
<div class="score"><div class="score-ring"><strong id="scoreValue">0%</strong><span>setup score</span></div><div><div id="setupName" class="setup-name">No chart analysed</div><p id="setupText">Upload a chart and run the scanner.</p></div></div>
<div class="levels"><div><span>Entry</span><strong id="entry">—</strong></div><div><span>Stop</span><strong id="stop">—</strong></div><div><span>Target 1</span><strong id="tp1">—</strong></div><div><span>Target 2</span><strong id="tp2">—</strong></div></div>
<div class="checklist"><h3>Confluence</h3><div id="checks"></div></div><div class="notes"><h3>Scanner note</h3><p id="note">This first version uses transparent browser-side heuristics. It does not claim a guaranteed win rate and does not place trades.</p></div>
</aside></main></div>`;

const $=id=>document.querySelector(id), els={file:$("#fileInput"),analyse:$("#analyseBtn"),clear:$("#clearBtn"),download:$("#downloadBtn"),canvas:$("#chartCanvas"),empty:$("#emptyState"),badge:$("#signalBadge"),bias:$("#bias"),threshold:$("#threshold"),thresholdValue:$("#thresholdValue"),score:$("#scoreValue"),setup:$("#setupName"),text:$("#setupText"),entry:$("#entry"),stop:$("#stop"),tp1:$("#tp1"),tp2:$("#tp2"),checks:$("#checks"),note:$("#note")};
const ctx=els.canvas.getContext("2d"); let sourceImage=null,lastAnalysis=null;

els.threshold.addEventListener("input",()=>els.thresholdValue.textContent=els.threshold.value+"%");
els.file.addEventListener("change",()=>{const f=els.file.files?.[0];if(f)loadImage(f)});
["dragenter","dragover"].forEach(t=>els.canvas.parentElement.addEventListener(t,e=>{e.preventDefault();els.canvas.parentElement.classList.add("dragging")}));
["dragleave","drop"].forEach(t=>els.canvas.parentElement.addEventListener(t,e=>{e.preventDefault();els.canvas.parentElement.classList.remove("dragging")}));
els.canvas.parentElement.addEventListener("drop",e=>{const f=e.dataTransfer.files?.[0];if(f?.type.startsWith("image/"))loadImage(f)});

function loadImage(file){const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{sourceImage=img;fitCanvas();drawBase();els.empty.hidden=true;els.analyse.disabled=false;els.download.disabled=false;resetResults();URL.revokeObjectURL(url)};img.src=url}
function fitCanvas(){if(!sourceImage)return;const maxW=Math.max(600,els.canvas.parentElement.clientWidth-2),maxH=Math.max(420,innerHeight*.68),scale=Math.min(maxW/sourceImage.width,maxH/sourceImage.height,1);els.canvas.width=Math.max(1,Math.round(sourceImage.width*scale));els.canvas.height=Math.max(1,Math.round(sourceImage.height*scale))}
function drawBase(){if(sourceImage){ctx.clearRect(0,0,els.canvas.width,els.canvas.height);ctx.drawImage(sourceImage,0,0,els.canvas.width,els.canvas.height)}}
function resetResults(){els.badge.textContent="WAIT";els.badge.className="badge neutral";els.score.textContent="0%";els.setup.textContent="No chart analysed";els.text.textContent="Upload a chart and run the scanner";["entry","stop","tp1","tp2"].forEach(k=>els[k].textContent="—");els.checks.innerHTML="";lastAnalysis=null}

els.analyse.addEventListener("click",analyseChart);
function analyseChart(){
 if(!sourceImage)return;drawBase();const w=els.canvas.width,h=els.canvas.height,p=ctx.getImageData(0,0,w,h).data;
 const trend=estimateTrend(p,w,h),bias=els.bias.value,direction=bias==="auto"?trend.direction:bias==="bullish"?"LONG":bias==="bearish"?"SHORT":"WAIT";
 const structure=detectStructure(p,w,h,direction),volume=estimateVolumeProfile(p,w,h),score=calculateScore(direction,trend,structure,volume),threshold=+els.threshold.value,signal=direction!=="WAIT"&&score>=threshold?direction:"WAIT";
 const entryY=clamp(h*(signal==="SHORT"?.43:signal==="LONG"?.57:.5),40,h-40),risk=Math.max(18,h*.055),r1=risk*1.8,r2=risk*2.8;
 const levels={entryY,stopY:signal==="SHORT"?entryY+risk:entryY-risk,tp1Y:signal==="SHORT"?entryY-r1:entryY+r1,tp2Y:signal==="SHORT"?entryY-r2:entryY+r2};
 drawAnalysis(signal,volume,levels,w,h);
 els.badge.textContent=signal;els.badge.className="badge "+signal.toLowerCase();els.score.textContent=score+"%";
 els.setup.textContent=signal==="WAIT"?"WAIT — no qualifying setup":signal==="LONG"?"Long continuation candidate":"Short continuation candidate";
 els.text.textContent=signal==="WAIT"?"The current evidence does not clear the selected quality threshold.":"A chart structure candidate was found. Confirm it with your own market data before acting.";
 els.entry.textContent="Chart level";els.stop.textContent="Chart level";els.tp1.textContent="Chart level";els.tp2.textContent="Chart level";
 const checks=[["Higher-timeframe bias",bias==="auto"?trend.direction!=="WAIT":bias!=="neutral",trend.label],["Structure",structure.score>=.5,structure.label],["Volume / POC area",volume.score>=.5,volume.label],["Breakout / pullback",structure.pullback,structure.pullback?"Detected":"Not clear"]];
 els.checks.innerHTML=checks.map(([n,ok,d])=>`<div class="check"><span class="${ok?"ok":"no"}">${ok?"✓":"—"}</span><div><strong>${n}</strong><small>${d}</small></div></div>`).join("");
 els.note.textContent=signal==="WAIT"?"WAIT is intentional: the scanner filters lower-quality conditions instead of forcing a signal.":"This is an image-based technical-analysis aid, not a price feed. Levels are chart-relative because a screenshot alone cannot reliably provide exact instrument prices.";
 lastAnalysis={signal,score,levels};
}

function estimateTrend(data,w,h){const ys=[],n=36;for(let i=0;i<n;i++){const x=Math.round(i/(n-1)*(w-1));let sum=0,count=0;for(let y=Math.round(h*.08);y<Math.round(h*.92);y+=3){const i4=(y*w+x)*4,b=(data[i4]+data[i4+1]+data[i4+2])/3;if(b<110){sum+=y;count++}}ys.push(count?sum/count:h/2)}const d=avg(ys.slice(0,8))-avg(ys.slice(-8)),dir=Math.abs(d)<h*.035?"WAIT":d>0?"LONG":"SHORT";return{direction:dir,strength:clamp(Math.abs(d)/(h*.28),0,1),label:dir==="WAIT"?"No clear directional bias":dir==="LONG"?"Upward visual bias":"Downward visual bias"}}
function detectStructure(data,w,h,direction){const bands=[];for(let x=0;x<w;x+=Math.max(2,Math.floor(w/120))){let edge=0;for(let y=1;y<h-1;y+=4){const a=lum(data,(y*w+x)*4),b=lum(data,((y+4)*w+x)*4);if(Math.abs(a-b)>35)edge++}bands.push(edge)}const score=clamp(avg(bands)/Math.max(1,h/20),0,1);return{score,pullback:score>.45&&direction!=="WAIT",label:score>.65?"Strong visual structure":score>.45?"Structure present":"Structure unclear"}}
function estimateVolumeProfile(data,w,h){const bins=24,c=Array(bins).fill(0);for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=5){const i=(y*w+x)*4;if(lum(data,i)<105)c[Math.min(bins-1,Math.floor(y/h*bins))]++}const max=Math.max(...c),poc=c.indexOf(max);return{poc,score:max?clamp(max/(avg(c)*2.2),0,1):0,label:max?"POC candidate near "+Math.round(poc/bins*100)+"% chart height":"No clear POC candidate"}}
function calculateScore(direction,t,s,v){if(direction==="WAIT")return Math.round(45+s.score*15);return Math.round(clamp(55+t.strength*18+s.score*17+v.score*10,0,98))}
function drawAnalysis(signal,volume,l,w,h){const zh=Math.max(34,h*.09),zy=l.entryY-zh/2;ctx.save();ctx.globalAlpha=.15;ctx.fillStyle=signal==="LONG"?"#22c55e":signal==="SHORT"?"#ef4444":"#94a3b8";ctx.fillRect(w*.18,zy,w*.64,zh);ctx.restore();line(l.entryY,"ENTRY","#f8fafc",w);line(l.tp1Y,"TP1","#38bdf8",w);line(l.tp2Y,"TP2","#38bdf8",w);line(l.stopY,"SL","#fb7185",w);label(w*.19,zy+zh/2,signal==="LONG"?"LONG BLOCK":signal==="SHORT"?"SHORT BLOCK":"WAIT ZONE",signal);label(w*.19,clamp(h*(.12+volume.poc/24*.72),22,h-22),"POC CANDIDATE","POC");label(w*.72,clamp(l.entryY-10,20,h-20),signal,signal)}
function line(y,t,color,w){ctx.save();ctx.setLineDash([9,7]);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,y);ctx.lineTo(w*.94,y);ctx.stroke();ctx.restore();label(w*.83,y-8,t,"LEVEL")}
function label(x,y,t,k){ctx.save();ctx.font="700 12px Inter,system-ui,sans-serif";const pad=7,width=ctx.measureText(t).width+pad*2;ctx.fillStyle=k==="LONG"?"#166534":k==="SHORT"?"#991b1b":k==="POC"?"#334155":"#111827";ctx.fillRect(x,y-17,width,24);ctx.fillStyle="#fff";ctx.fillText(t,x+pad,y);ctx.restore()}
function lum(d,i){return .2126*d[i]+.7152*d[i+1]+.0722*d[i+2]}function avg(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:0}function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
els.clear.addEventListener("click",()=>{sourceImage=null;els.file.value="";ctx.clearRect(0,0,els.canvas.width,els.canvas.height);els.empty.hidden=false;els.analyse.disabled=true;els.download.disabled=true;resetResults()});
els.download.addEventListener("click",()=>{if(!sourceImage)return;const a=document.createElement("a");a.download="ai-chart-scanner-annotated.png";a.href=els.canvas.toDataURL("image/png");a.click()});
addEventListener("resize",()=>{if(!sourceImage)return;fitCanvas();drawBase();if(lastAnalysis)analyseChart()});
