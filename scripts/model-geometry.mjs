// Prints where parts of a NASA glTF land after the viewer scales it, to help place hotspots.
// Usage: node scripts/model-geometry.mjs public/models/<file>.glb <fit> <groundY|float>
//        SEL=z,1.0,2 node scripts/model-geometry.mjs ...   (centroid of points with 1.0 <= z <= 2)
// Or open a story with ?debug before the # and click the model: the console prints the point.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [file, fit, groundOrFloat] = process.argv.slice(2);
const doc = await io.read(file);
const mul = (m, v) => [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
const pts = []; // [x,y,z,node]
for (const n of doc.getRoot().listNodes()) {
  const mesh = n.getMesh(); if (!mesh) continue;
  const W = n.getWorldMatrix();
  for (const p of mesh.listPrimitives()) {
    const a = p.getAttribute('POSITION'); const v = [0,0,0];
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); pts.push([...mul(W, v), n.getName()]); }
  }
}
const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
for (const p of pts) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],p[k]); mx[k]=Math.max(mx[k],p[k]); }
const s = Number(fit)/Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
const cx=(mn[0]+mx[0])/2, cy=(mn[1]+mx[1])/2, cz=(mn[2]+mx[2])/2;
const float = groundOrFloat === 'float'; const g = Number(groundOrFloat);
const N = pts.map(p => [(p[0]-cx)*s, float ? (p[1]-cy)*s : (p[1]-mn[1])*s + g, (p[2]-cz)*s, p[3]]);
const f = (x) => x.toFixed(2);
const red=(k,fn)=>N.reduce((a,p)=>fn(a,p[k]),fn===Math.min?1e9:-1e9); console.log('normalized bbox', [0,1,2].map(k=>f(red(k,Math.min))+'..'+f(red(k,Math.max))).join(' | '));
const byNode = {};
for (const p of N) { const b = byNode[p[3]] ??= {mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9],c:0}; b.c++; for(let k=0;k<3;k++){b.mn[k]=Math.min(b.mn[k],p[k]);b.mx[k]=Math.max(b.mx[k],p[k]);} }
for (const [k,b] of Object.entries(byNode)) console.log('node', k, b.c, 'min', b.mn.map(f).join(','), 'max', b.mx.map(f).join(','));
// height bands: horizontal extent per band
const y0=red(1,Math.min), y1=red(1,Math.max);
for (let i=0;i<10;i++){ const lo=y0+(y1-y0)*i/10, hi=y0+(y1-y0)*(i+1)/10; const band=N.filter(p=>p[1]>=lo&&p[1]<hi); if(!band.length) continue; const r2=(k,fn)=>band.reduce((a,p)=>fn(a,p[k]),fn===Math.min?1e9:-1e9); const bx=[r2(0,Math.min),r2(0,Math.max)], bz=[r2(2,Math.min),r2(2,Math.max)]; const c=[band.reduce((a,p)=>a+p[0],0)/band.length, band.reduce((a,p)=>a+p[2],0)/band.length]; console.log(`band y ${f(lo)}..${f(hi)} n=${band.length} x ${f(bx[0])}..${f(bx[1])} z ${f(bz[0])}..${f(bz[1])} centroid ${f(c[0])},${f(c[1])}`); }

const sel=process.env.SEL; if(sel){ const [k,lo,hi]=sel.split(','); const ki={x:0,y:1,z:2}[k]; const pts2=N.filter(p=>p[ki]>=+lo&&p[ki]<=+hi); const c=[0,1,2].map(i=>pts2.reduce((a,p)=>a+p[i],0)/pts2.length); console.log('SEL',sel,'n',pts2.length,'centroid',c.map(f).join(', ')); }
