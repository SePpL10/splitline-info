(function(){
function clone(o){return JSON.parse(JSON.stringify(o))}
function setPaint(L,id,k,v){const l=L.find(x=>x.id===id);if(l){l.paint=l.paint||{};l.paint[k]=v}}
// base = Protomaps-Layer (light oder dark), opts: {dark, glyphs, sprite, pm, dem, contourUrl}
window.lfOffStyle=function(base,opts){
  const D=!!opts.dark;
  const C=D?{bg:'#151a21',earth:'#1b212a',forest:'#1f2c25',grass:'#1e2822',water:'#16324a',wline:'#2a5578',bld:'#2a313b',
      path:'#e0a060',track:'#c9905a',road:'#3a4350',roadmaj:'#4a5564',cont:'rgba(200,170,120,.28)',contI:'rgba(200,170,120,.5)',contT:'#a89070',
      shade:'#000000',hi:'#2a3340',label:'#c8d0da',halo:'#151a21'}
    :{bg:'#f6f5f1',earth:'#f8f7f3',forest:'#d3e8c4',grass:'#e7f1da',water:'#9fd0f0',wline:'#6fb0d8',bld:'#cfc7bb',
      path:'#e3261c',track:'#3f444c',road:'#ffffff',roadmaj:'#fff3d6',cont:'rgba(176,118,58,.30)',contI:'rgba(176,118,58,.58)',contT:'#9a6638', // 1.0.60 Josef 10.11.: Pfade rot, Forstwege dunkelgrau, Höhenlinien braun – gut unterscheidbar
      shade:'rgba(70,72,80,.55)',hi:'#ffffff',label:'#2b3440',halo:'#f8f7f3'}; // 1.0.60 Josef: Variante B „heller“
  C.shadeEx=D?.45:.28;
  if(opts.colors&&typeof opts.colors==='object')Object.keys(C).forEach(k=>{const v=opts.colors[(D?'dark_':'light_')+k];if(k==='shadeEx'){const n=parseFloat(v);if(isFinite(n)&&n>=0&&n<=1)C[k]=n}else if(typeof v==='string'&&v.length<40)C[k]=v});
  const L=clone(base).filter(l=>l&&typeof l==='object'&&typeof l.id==='string'&&l.id!=='landcover'&&(!l.source||l.source==='protomaps')&&!l.id.startsWith('lf_'));
  setPaint(L,'background','background-color',C.bg);
  setPaint(L,'earth','fill-color',C.earth);
  setPaint(L,'water','fill-color',C.water);
  ['water_stream','water_river'].forEach(id=>setPaint(L,id,'line-color',C.wline));
  setPaint(L,'buildings','fill-color',C.bld);setPaint(L,'buildings','fill-opacity',D?.9:.85);
  // Wald/Wiese wie Wanderkarte
  setPaint(L,'landuse_park','fill-color',['match',['get','kind'],['forest','wood'],C.forest,['grassland','grass','scrub'],C.grass,['glacier'],D?'#2a3440':'#ffffff',['sand'],D?'#3a3428':'#f3e6c4',D?'#1d2722':'#d7e8cc']);
  // Wege: Pfade gestrichelt, Feld-/Forstwege braun
  const idx=L.findIndex(x=>x.id==='roads_other');
  if(idx>=0){
    L[idx].filter=['all',['!has','is_tunnel'],['!has','is_bridge'],['in','kind','other','path'],['!=','kind_detail','pier'],['!=','kind_detail','track']]; // 1.0.60: Forstwege nicht zusätzlich als Pfad zeichnen
    L[idx].paint={'line-color':C.path,'line-width':['interpolate',['linear'],['zoom'],12,.6,14,1.2,17,2.4],'line-dasharray':[2.2,1.4]};
    L[idx].minzoom=12;
    L.splice(idx,0,{id:'lf_track',type:'line',source:'protomaps','source-layer':'roads',minzoom:12,
      filter:['all',['!has','is_tunnel'],['==','kind_detail','track']],
      paint:{'line-color':C.track,'line-width':['interpolate',['linear'],['zoom'],12,.8,14,1.6,17,3.2],'line-dasharray':[3,1.2]}});
  }
  // Schummerung + Höhenlinien direkt über Landnutzung, unter Wasser
  const wi=L.findIndex(x=>x.id==='water');
  const extra=[];
  if(opts.dem){
    extra.push({id:'lf_shade',type:'hillshade',source:'lfdem',maxzoom:16,
      paint:{'hillshade-exaggeration':C.shadeEx,'hillshade-shadow-color':C.shade,'hillshade-highlight-color':C.hi,'hillshade-accent-color':C.shade,'hillshade-illumination-anchor':'map'}});
  }
  if(opts.contourUrl){
    extra.push({id:'lf_cont',type:'line',source:'lfcont','source-layer':'contours',minzoom:11,
      paint:{'line-color':['match',['get','level'],1,C.contI,C.cont],'line-width':['match',['get','level'],1,1,.55]}});
  }
  L.splice(wi,0,...extra);
  if(opts.contourUrl){
    L.push({id:'lf_cont_lbl',type:'symbol',source:'lfcont','source-layer':'contours',minzoom:13,filter:['>',['get','level'],0],
      layout:{'symbol-placement':'line','text-size':10,'text-field':['concat',['to-string',['get','ele']],' m'],'text-font':['Noto Sans Regular']},
      paint:{'text-color':C.contT,'text-halo-color':C.halo,'text-halo-width':1.2}});
  }
  // Ortsnamen ruhiger
  L.forEach(l=>{if(l.type==='symbol'&&l.paint&&l.id.startsWith('places_')){l.paint['text-color']=C.label;l.paint['text-halo-color']=C.halo}});
  const src={protomaps:{type:'vector',url:opts.pm,attribution:'© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'}};
  if(opts.dem)src.lfdem={type:'raster-dem',tiles:[opts.dem],encoding:'terrarium',tileSize:256,maxzoom:12};
  if(opts.contourUrl)src.lfcont={type:'vector',tiles:[opts.contourUrl],maxzoom:15};
  return {version:8,glyphs:opts.glyphs,sprite:opts.sprite,sources:src,layers:L};
};
})();
