// ===== DATA & GLOBALS =====
let RAW = [], FILTERED = [], CHARTS = {};
const MONTHS = ['Jan/23','Feb/23','Mar/23','Apr/23','May/23','Jun/23','Jul/23','Aug/23','Sep/23','Oct/23','Nov/23','Dec/23','Jan/24','Feb/24','Mar/24','Apr/24','May/24','Jun/24','Jul/24','Aug/24','Sep/24','Oct/24','Nov/24','Dec/24','Jan/25','Feb/25','Mar/25','Apr/25','May/25','Jun/25','Jul/25','Aug/25','Sep/25','Oct/25','Nov/25','Dec/25'];
const M23 = MONTHS.slice(0,12), M24 = MONTHS.slice(12,24), M25 = MONTHS.slice(24,36);
const REGIONS = {N:['AC','AM','AP','PA','RO','RR','TO'],NE:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],CO:['DF','GO','MS','MT'],SE:['ES','MG','RJ','SP'],S:['PR','RS','SC']};
const COLORS = {indigo:'#6366f1',violet:'#8b5cf6',cyan:'#06b6d4',emerald:'#10b981',amber:'#f59e0b',rose:'#f43f5e',orange:'#f97316',sky:'#0ea5e9',pink:'#ec4899',lime:'#84cc16'};
const PALETTE = Object.values(COLORS);
const fmt = v => 'R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});

// ===== INIT =====
fetch('data.json').then(r=>r.json()).then(d=>{RAW=d;populateStates();applyFilters();setupNav();setupSort();setupSearch();setupMobile();});

function populateStates(){
  const s=new Set(RAW.map(d=>d.estado).filter(Boolean));
  const sel=document.getElementById('filter-state');
  [...s].sort().forEach(st=>{const o=document.createElement('option');o.value=st;o.textContent=st;sel.appendChild(o);});
}

// ===== FILTERS =====
['filter-year','filter-brand','filter-category','filter-state'].forEach(id=>document.getElementById(id).addEventListener('change',applyFilters));

function applyFilters(){
  const y=document.getElementById('filter-year').value;
  const b=document.getElementById('filter-brand').value;
  const c=document.getElementById('filter-category').value;
  const s=document.getElementById('filter-state').value;
  FILTERED=RAW.filter(d=>{
    if(b!=='all'&&d.marca!==b)return false;
    if(c!=='all'&&d.categoria!==c)return false;
    if(s!=='all'&&d.estado!==s)return false;
    return true;
  });
  updateAll(y);
}

function getMonths(y){return y==='2023'?M23:y==='2024'?M24:y==='2025'?M25:MONTHS;}

function sumMonths(d,ms){return ms.reduce((a,m)=>a+(d.monthly[m]||0),0);}

// ===== UPDATE ALL =====
function updateAll(y){
  updateKPIs(y);updateOverview(y);updateEvolution(y);updateBrands(y);updateGeo(y);updateRanking(y);updateTable(y);
}

// ===== KPIs =====
function updateKPIs(y){
  const ms=getMonths(y);
  const total=FILTERED.reduce((a,d)=>a+sumMonths(d,ms),0);
  const visat=FILTERED.filter(d=>d.marca==='VISAT').reduce((a,d)=>a+sumMonths(d,ms),0);
  const prime=FILTERED.filter(d=>d.marca==='PRIME').reduce((a,d)=>a+sumMonths(d,ms),0);
  const activeClients=FILTERED.filter(d=>d.status!=='INATIVO').length;
  const states=new Set(FILTERED.map(d=>d.estado).filter(Boolean)).size;
  const avgTicket=activeClients?total/activeClients/ms.length:0;
  document.getElementById('kpi-total-value').textContent=fmt(total);
  document.getElementById('kpi-visat-value').textContent=fmt(visat);
  document.getElementById('kpi-prime-value').textContent=fmt(prime);
  document.getElementById('kpi-clients-value').textContent=activeClients;
  document.getElementById('kpi-states-value').textContent=states;
  document.getElementById('kpi-avg-value').textContent=fmt(avgTicket);
  // changes
  if(y!=='all'){
    const prev=y==='2024'?M23:y==='2025'?M24:null;
    if(prev){
      const prevTotal=FILTERED.reduce((a,d)=>a+sumMonths(d,prev),0);
      const pct=prevTotal?((total-prevTotal)/prevTotal*100):0;
      setChange('kpi-total-change',pct);
    }else{setNeutral('kpi-total-change');}
  }else{setNeutral('kpi-total-change');}
  setNeutral('kpi-visat-change');setNeutral('kpi-prime-change');setNeutral('kpi-clients-change');setNeutral('kpi-states-change');setNeutral('kpi-avg-change');
}
function setChange(id,pct){
  const el=document.getElementById(id);
  el.textContent=(pct>=0?'▲':'▼')+' '+Math.abs(pct).toFixed(1)+'% vs ano anterior';
  el.className='kpi-change '+(pct>=0?'positive':'negative');
}
function setNeutral(id){const el=document.getElementById(id);el.textContent='Período selecionado';el.className='kpi-change neutral';}

// ===== CHART HELPERS =====
function destroyChart(key){if(CHARTS[key]){CHARTS[key].destroy();delete CHARTS[key];}}
function chartOpts(type,extra={}){
  return{type,options:{responsive:true,maintainAspectRatio:false,animation:{duration:600},plugins:{legend:{display:false,labels:{color:'#94a3b8',font:{family:'Inter',size:11}}},tooltip:{backgroundColor:'rgba(17,24,39,0.95)',titleColor:'#f1f5f9',bodyColor:'#94a3b8',borderColor:'rgba(99,102,241,0.3)',borderWidth:1,padding:12,titleFont:{family:'Inter',weight:'600'},bodyFont:{family:'Inter'},callbacks:{label:ctx=>{const v=ctx.parsed.y??ctx.parsed??ctx.raw;return typeof v==='number'?fmt(v):v;}}}},scales:type==='doughnut'||type==='pie'||type==='polarArea'?{}:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{family:'Inter',size:10},maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{family:'Inter',size:10},callback:v=>fmt(v)}}},...extra}};
}
function gradient(ctx,c1,c2){const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;}

// ===== OVERVIEW CHARTS =====
function updateOverview(y){
  const ms=getMonths(y);
  // Line chart
  const visatData=ms.map(m=>FILTERED.filter(d=>d.marca==='VISAT').reduce((a,d)=>a+(d.monthly[m]||0),0));
  const primeData=ms.map(m=>FILTERED.filter(d=>d.marca==='PRIME').reduce((a,d)=>a+(d.monthly[m]||0),0));
  destroyChart('overviewLine');
  const ctx1=document.getElementById('chart-overview-line').getContext('2d');
  CHARTS.overviewLine=new Chart(ctx1,{...chartOpts('line'),data:{labels:ms,datasets:[
    {label:'VISAT',data:visatData,borderColor:COLORS.cyan,backgroundColor:gradient(ctx1,'rgba(6,182,212,0.15)','rgba(6,182,212,0)'),fill:true,tension:0.4,pointRadius:1,borderWidth:2},
    {label:'PRIME',data:primeData,borderColor:COLORS.amber,backgroundColor:gradient(ctx1,'rgba(245,158,11,0.1)','rgba(245,158,11,0)'),fill:true,tension:0.4,pointRadius:1,borderWidth:2}
  ]}});
  CHARTS.overviewLine.options.plugins.legend.display=true;CHARTS.overviewLine.update();

  // Doughnut
  const visatTotal=visatData.reduce((a,b)=>a+b,0);
  const primeTotal=primeData.reduce((a,b)=>a+b,0);
  destroyChart('overviewDoughnut');
  CHARTS.overviewDoughnut=new Chart(document.getElementById('chart-overview-doughnut'),{...chartOpts('doughnut'),data:{labels:['VISAT','PRIME'],datasets:[{data:[visatTotal,primeTotal],backgroundColor:[COLORS.cyan,COLORS.amber],borderWidth:0,hoverOffset:8}]},options:{...chartOpts('doughnut').options,cutout:'70%',plugins:{...chartOpts('doughnut').options.plugins,legend:{display:true,position:'bottom',labels:{color:'#94a3b8',font:{family:'Inter',size:12},padding:16}}}}});

  // Top 5 states
  const stMap={};FILTERED.forEach(d=>{if(!d.estado)return;stMap[d.estado]=(stMap[d.estado]||0)+sumMonths(d,ms);});
  const top5=Object.entries(stMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  destroyChart('overviewStates');
  CHARTS.overviewStates=new Chart(document.getElementById('chart-overview-states'),{...chartOpts('bar'),data:{labels:top5.map(s=>s[0]),datasets:[{data:top5.map(s=>s[1]),backgroundColor:PALETTE.slice(0,5),borderRadius:6,borderSkipped:false}]}});

  // Categories
  const catMap={};FILTERED.forEach(d=>{catMap[d.categoria]=(catMap[d.categoria]||0)+sumMonths(d,ms);});
  destroyChart('overviewCats');
  CHARTS.overviewCats=new Chart(document.getElementById('chart-overview-categories'),{...chartOpts('doughnut'),data:{labels:Object.keys(catMap),datasets:[{data:Object.values(catMap),backgroundColor:[COLORS.indigo,COLORS.emerald,COLORS.rose],borderWidth:0}]},options:{...chartOpts('doughnut').options,cutout:'65%',plugins:{...chartOpts('doughnut').options.plugins,legend:{display:true,position:'bottom',labels:{color:'#94a3b8',font:{family:'Inter',size:11},padding:12}}}}});

  // Yearly
  const y23=FILTERED.reduce((a,d)=>a+sumMonths(d,M23),0);
  const y24=FILTERED.reduce((a,d)=>a+sumMonths(d,M24),0);
  const y25=FILTERED.reduce((a,d)=>a+sumMonths(d,M25),0);
  destroyChart('overviewYearly');
  CHARTS.overviewYearly=new Chart(document.getElementById('chart-overview-yearly'),{...chartOpts('bar'),data:{labels:['2023','2024','2025'],datasets:[{data:[y23,y24,y25],backgroundColor:[COLORS.indigo,COLORS.violet,COLORS.cyan],borderRadius:8,borderSkipped:false}]}});
}

// ===== EVOLUTION =====
function updateEvolution(y){
  const ms=getMonths(y);
  const vData=ms.map(m=>FILTERED.filter(d=>d.marca==='VISAT').reduce((a,d)=>a+(d.monthly[m]||0),0));
  const pData=ms.map(m=>FILTERED.filter(d=>d.marca==='PRIME').reduce((a,d)=>a+(d.monthly[m]||0),0));
  const tData=ms.map((_,i)=>vData[i]+pData[i]);

  destroyChart('evoMain');
  const ctx=document.getElementById('chart-evolution-main').getContext('2d');
  CHARTS.evoMain=new Chart(ctx,{...chartOpts('bar'),data:{labels:ms,datasets:[
    {label:'VISAT',data:vData,backgroundColor:COLORS.cyan,borderRadius:4,borderSkipped:false},
    {label:'PRIME',data:pData,backgroundColor:COLORS.amber,borderRadius:4,borderSkipped:false}
  ]},options:{...chartOpts('bar').options,scales:{...chartOpts('bar').options.scales,x:{...chartOpts('bar').options.scales.x,stacked:true},y:{...chartOpts('bar').options.scales.y,stacked:true}},plugins:{...chartOpts('bar').options.plugins,legend:{display:true,labels:{color:'#94a3b8',font:{family:'Inter',size:11}}}}}});

  // Cumulative
  let cum=0;const cumData=tData.map(v=>{cum+=v;return cum;});
  destroyChart('evoCum');
  const ctx2=document.getElementById('chart-evolution-cumulative').getContext('2d');
  CHARTS.evoCum=new Chart(ctx2,{...chartOpts('line'),data:{labels:ms,datasets:[{label:'Acumulado',data:cumData,borderColor:COLORS.emerald,backgroundColor:gradient(ctx2,'rgba(16,185,129,0.15)','rgba(16,185,129,0)'),fill:true,tension:0.4,pointRadius:1,borderWidth:2}]}});

  // Monthly change %
  const chg=tData.map((v,i)=>i===0?0:(tData[i-1]?((v-tData[i-1])/tData[i-1]*100):0));
  destroyChart('evoChange');
  CHARTS.evoChange=new Chart(document.getElementById('chart-evolution-change'),{...chartOpts('bar'),data:{labels:ms,datasets:[{data:chg,backgroundColor:chg.map(v=>v>=0?'rgba(16,185,129,0.6)':'rgba(244,63,94,0.6)'),borderRadius:3,borderSkipped:false}]},options:{...chartOpts('bar').options,scales:{...chartOpts('bar').options.scales,y:{...chartOpts('bar').options.scales.y,ticks:{...chartOpts('bar').options.scales.y.ticks,callback:v=>v.toFixed(0)+'%'}}},plugins:{...chartOpts('bar').options.plugins,tooltip:{...chartOpts('bar').options.plugins.tooltip,callbacks:{label:ctx=>ctx.raw.toFixed(1)+'%'}}}}});
}

// ===== BRANDS =====
function updateBrands(y){
  const ms=getMonths(y);
  const vClients=FILTERED.filter(d=>d.marca==='VISAT');
  const pClients=FILTERED.filter(d=>d.marca==='PRIME');
  const vTotal=vClients.reduce((a,d)=>a+sumMonths(d,ms),0);
  const pTotal=pClients.reduce((a,d)=>a+sumMonths(d,ms),0);
  document.getElementById('brand-visat-total').textContent=fmt(vTotal);
  document.getElementById('brand-prime-total').textContent=fmt(pTotal);
  document.getElementById('brand-visat-clients').textContent=vClients.length;
  document.getElementById('brand-prime-clients').textContent=pClients.length;
  document.getElementById('brand-visat-avg').textContent=fmt(vClients.length?vTotal/vClients.length/ms.length:0);
  document.getElementById('brand-prime-avg').textContent=fmt(pClients.length?pTotal/pClients.length/ms.length:0);
  document.getElementById('brand-visat-states').textContent=new Set(vClients.map(d=>d.estado).filter(Boolean)).size;
  document.getElementById('brand-prime-states').textContent=new Set(pClients.map(d=>d.estado).filter(Boolean)).size;

  // VISAT line
  const vLine=ms.map(m=>vClients.reduce((a,d)=>a+(d.monthly[m]||0),0));
  destroyChart('brandVisat');
  const ctx=document.getElementById('chart-brand-visat').getContext('2d');
  CHARTS.brandVisat=new Chart(ctx,{...chartOpts('line'),data:{labels:ms,datasets:[{data:vLine,borderColor:COLORS.cyan,backgroundColor:gradient(ctx,'rgba(6,182,212,0.15)','rgba(6,182,212,0)'),fill:true,tension:0.4,pointRadius:1,borderWidth:2}]}});

  // PRIME line
  const pLine=ms.map(m=>pClients.reduce((a,d)=>a+(d.monthly[m]||0),0));
  destroyChart('brandPrime');
  const ctx2=document.getElementById('chart-brand-prime').getContext('2d');
  CHARTS.brandPrime=new Chart(ctx2,{...chartOpts('line'),data:{labels:ms,datasets:[{data:pLine,borderColor:COLORS.amber,backgroundColor:gradient(ctx2,'rgba(245,158,11,0.1)','rgba(245,158,11,0)'),fill:true,tension:0.4,pointRadius:1,borderWidth:2}]}});

  // Top distribuidores
  function topChart(clients,canvasId,key,color){
    const totals={};clients.forEach(d=>{totals[d.distribuidor]=(totals[d.distribuidor]||0)+sumMonths(d,ms);});
    const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,8);
    destroyChart(key);
    CHARTS[key]=new Chart(document.getElementById(canvasId),{...chartOpts('bar'),data:{labels:top.map(t=>t[0].substring(0,18)),datasets:[{data:top.map(t=>t[1]),backgroundColor:color,borderRadius:6,borderSkipped:false}]},options:{...chartOpts('bar').options,indexAxis:'y'}});
  }
  topChart(vClients,'chart-brand-visat-top','brandVisatTop',COLORS.cyan);
  topChart(pClients,'chart-brand-prime-top','brandPrimeTop',COLORS.amber);
}

// ===== GEOGRAPHY =====
function updateGeo(y){
  const ms=getMonths(y);
  const stMap={};const stClients={};
  FILTERED.forEach(d=>{if(!d.estado||d.estado==='N/A')return;stMap[d.estado]=(stMap[d.estado]||0)+sumMonths(d,ms);stClients[d.estado]=(stClients[d.estado]||0)+1;});
  const sorted=Object.entries(stMap).sort((a,b)=>b[1]-a[1]);
  const maxVal=sorted[0]?sorted[0][1]:1;

  // Bar chart
  destroyChart('geoStates');
  CHARTS.geoStates=new Chart(document.getElementById('chart-geo-states'),{...chartOpts('bar'),data:{labels:sorted.map(s=>s[0]),datasets:[{data:sorted.map(s=>s[1]),backgroundColor:sorted.map((_,i)=>PALETTE[i%PALETTE.length]),borderRadius:6,borderSkipped:false}]}});

  // Regions
  const regMap={};Object.entries(REGIONS).forEach(([r,states])=>{regMap[r]=FILTERED.filter(d=>states.includes(d.estado)).reduce((a,d)=>a+sumMonths(d,ms),0);});
  const regLabels={N:'Norte',NE:'Nordeste',CO:'Centro-Oeste',SE:'Sudeste',S:'Sul'};
  destroyChart('geoRegions');
  CHARTS.geoRegions=new Chart(document.getElementById('chart-geo-regions'),{...chartOpts('doughnut'),data:{labels:Object.keys(regMap).map(k=>regLabels[k]),datasets:[{data:Object.values(regMap),backgroundColor:[COLORS.emerald,COLORS.amber,COLORS.rose,COLORS.indigo,COLORS.cyan],borderWidth:0}]},options:{...chartOpts('doughnut').options,cutout:'65%',plugins:{...chartOpts('doughnut').options.plugins,legend:{display:true,position:'bottom',labels:{color:'#94a3b8',font:{family:'Inter',size:11},padding:12}}}}});

  // Top states evolution
  const top5St=sorted.slice(0,5).map(s=>s[0]);
  destroyChart('geoEvo');
  CHARTS.geoEvo=new Chart(document.getElementById('chart-geo-evolution'),{...chartOpts('bar'),data:{labels:top5St,datasets:[
    {label:'2023',data:top5St.map(st=>FILTERED.filter(d=>d.estado===st).reduce((a,d)=>a+sumMonths(d,M23),0)),backgroundColor:COLORS.indigo,borderRadius:4},
    {label:'2024',data:top5St.map(st=>FILTERED.filter(d=>d.estado===st).reduce((a,d)=>a+sumMonths(d,M24),0)),backgroundColor:COLORS.violet,borderRadius:4},
    {label:'2025',data:top5St.map(st=>FILTERED.filter(d=>d.estado===st).reduce((a,d)=>a+sumMonths(d,M25),0)),backgroundColor:COLORS.cyan,borderRadius:4}
  ]},options:{...chartOpts('bar').options,plugins:{...chartOpts('bar').options.plugins,legend:{display:true,labels:{color:'#94a3b8',font:{family:'Inter',size:11}}}}}});

  // State cards
  const grid=document.getElementById('state-cards-grid');
  grid.innerHTML=sorted.map(([st,val])=>`<div class="state-card"><div class="state-card-header"><span class="state-name">${st}</span><span class="state-clients">${stClients[st]||0} clientes</span></div><div class="state-value">${fmt(val)}</div><div class="state-bar"><div class="state-bar-fill" style="width:${(val/maxVal*100).toFixed(1)}%"></div></div></div>`).join('');
}

// ===== RANKING =====
function updateRanking(y){
  const ms=getMonths(y);
  const totals={};
  FILTERED.forEach(d=>{const k=d.distribuidor+'|'+d.marca+'|'+d.estado;if(!totals[k])totals[k]={name:d.distribuidor,marca:d.marca,estado:d.estado,total:0};totals[k].total+=sumMonths(d,ms);});
  const sorted=Object.values(totals).sort((a,b)=>b.total-a.total);
  const top15=sorted.slice(0,15);

  destroyChart('rankBar');
  CHARTS.rankBar=new Chart(document.getElementById('chart-ranking-bar'),{...chartOpts('bar'),data:{labels:top15.map(d=>d.name.substring(0,20)),datasets:[{data:top15.map(d=>d.total),backgroundColor:top15.map(d=>d.marca==='VISAT'?COLORS.cyan:COLORS.amber),borderRadius:6,borderSkipped:false}]},options:{...chartOpts('bar').options,indexAxis:'y'}});

  const list=document.getElementById('ranking-list');
  list.innerHTML=sorted.slice(0,25).map((d,i)=>{
    const posClass=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    return `<div class="ranking-item"><span class="ranking-position ${posClass}">${i+1}°</span><span class="ranking-name">${d.name}</span><span class="ranking-brand ${d.marca.toLowerCase()}">${d.marca}</span><span class="ranking-value">${fmt(d.total)}</span><span class="ranking-state">${d.estado}</span></div>`;
  }).join('');
}

// ===== TABLE =====
let tablePage=0,tableSort='total',tableSortDir=-1,tableSearchTerm='';
function updateTable(y){
  const ms=getMonths(y);
  let rows=FILTERED.map(d=>({...d,total:sumMonths(d,ms),y23:sumMonths(d,M23),y24:sumMonths(d,M24),y25:sumMonths(d,M25)}));
  if(tableSearchTerm)rows=rows.filter(d=>d.distribuidor.toLowerCase().includes(tableSearchTerm));
  rows.sort((a,b)=>{
    const va=tableSort==='total'?a.total:tableSort==='2023'?a.y23:tableSort==='2024'?a.y24:tableSort==='2025'?a.y25:tableSort==='distribuidor'?a.distribuidor:tableSort==='marca'?a.marca:tableSort==='estado'?a.estado:tableSort==='categoria'?a.categoria:tableSort==='status'?a.status:a.total;
    const vb=tableSort==='total'?b.total:tableSort==='2023'?b.y23:tableSort==='2024'?b.y24:tableSort==='2025'?b.y25:tableSort==='distribuidor'?b.distribuidor:tableSort==='marca'?b.marca:tableSort==='estado'?b.estado:tableSort==='categoria'?b.categoria:tableSort==='status'?b.status:b.total;
    if(typeof va==='string')return tableSortDir*(va.localeCompare(vb));
    return tableSortDir*(va-vb);
  });
  const perPage=20,totalPages=Math.ceil(rows.length/perPage);
  tablePage=Math.min(tablePage,totalPages-1);if(tablePage<0)tablePage=0;
  const pageRows=rows.slice(tablePage*perPage,(tablePage+1)*perPage);
  const tbody=document.getElementById('table-body');
  tbody.innerHTML=pageRows.map((d,i)=>{
    const rank=tablePage*perPage+i+1;
    const trend=d.y25>d.y24?'📈':d.y25<d.y24?'📉':'➡️';
    return `<tr><td>${rank}</td><td><span class="badge-marca ${d.marca.toLowerCase()}">${d.marca}</span></td><td>${d.distribuidor}</td><td>${d.categoria}</td><td>${d.estado}</td><td><span class="badge-status ${d.status.toLowerCase()}">${d.status}</span></td><td><strong>${fmt(d.total)}</strong></td><td>${fmt(d.y23)}</td><td>${fmt(d.y24)}</td><td>${fmt(d.y25)}</td><td style="text-align:center">${trend}</td></tr>`;
  }).join('');
  document.getElementById('table-count').textContent=rows.length+' registros';
  const pag=document.getElementById('table-pagination');
  pag.innerHTML='';
  for(let i=0;i<totalPages;i++){
    const btn=document.createElement('button');btn.className='page-btn'+(i===tablePage?' active':'');btn.textContent=i+1;
    btn.onclick=()=>{tablePage=i;updateTable(document.getElementById('filter-year').value);};pag.appendChild(btn);
  }
}
function setupSort(){
  document.querySelectorAll('.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const s=th.dataset.sort;if(tableSort===s)tableSortDir*=-1;else{tableSort=s;tableSortDir=-1;}
      document.querySelectorAll('.sortable').forEach(t=>t.classList.remove('sorted-asc','sorted-desc'));
      th.classList.add(tableSortDir===1?'sorted-asc':'sorted-desc');
      tablePage=0;updateTable(document.getElementById('filter-year').value);
    });
  });
}
function setupSearch(){
  document.getElementById('table-search').addEventListener('input',e=>{
    tableSearchTerm=e.target.value.toLowerCase();tablePage=0;
    updateTable(document.getElementById('filter-year').value);
  });
}

// ===== NAVIGATION =====
function setupNav(){
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click',e=>{
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      item.classList.add('active');
      const sec=item.dataset.section;
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      document.getElementById('section-'+sec).classList.add('active');
      closeMobile();
    });
  });
}

// ===== MOBILE =====
function setupMobile(){
  const toggle=document.getElementById('menu-toggle');
  const sidebar=document.getElementById('sidebar');
  let overlay=document.createElement('div');overlay.className='sidebar-overlay';document.body.appendChild(overlay);
  toggle.addEventListener('click',()=>{sidebar.classList.toggle('open');overlay.classList.toggle('active');});
  overlay.addEventListener('click',closeMobile);
}
function closeMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('active');
}
