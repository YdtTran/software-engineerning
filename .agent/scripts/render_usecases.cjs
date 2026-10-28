const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.DRAWIO_PLAYWRIGHT || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const extensionRoot = path.join(os.homedir(), '.vscode/extensions');
const extension = fs.readdirSync(extensionRoot).filter(n => n.startsWith('hediet.vscode-drawio-')).sort().at(-1);
const viewer = process.env.DRAWIO_VIEWER || path.join(extensionRoot, extension, 'drawio/src/main/webapp/js/viewer-static.min.js');
const base = path.resolve(__dirname, '../../01_Diagram/01_Usecase_Diagram');
const files = ['GENERAL', 'STUDENTS', 'OPERATOR'].flatMap(dir => fs.readdirSync(path.join(base, dir)).filter(n => n.endsWith('.drawio')).map(n => path.join(base, dir, n))).sort();

function intersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const x = cross(a,b,c), y = cross(a,b,d), z = cross(c,d,a), w = cross(c,d,b);
  if (Math.abs(x)<1e-5 && Math.abs(y)<1e-5) {
    const axis = Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?'x':'y';
    return Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis])) > .1;
  }
  const onInterior = (p,q,r) => Math.abs(cross(p,q,r))<1e-5 && (r.x-p.x)*(r.x-q.x)+(r.y-p.y)*(r.y-q.y)<-.01;
  if(onInterior(a,b,c)||onInterior(a,b,d)||onInterior(c,d,a)||onInterior(c,d,b)) return true;
  return x*y < -1e-5 && z*w < -1e-5;
}
function inside(p, r) { return p.x>r.x+.5 && p.x<r.x+r.w-.5 && p.y>r.y+.5 && p.y<r.y+r.h-.5; }
function hits(a,b,r) {
  const corners=[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
  return inside(a,r)||inside(b,r)||corners.some((c,i)=>intersect(a,b,c,corners[(i+1)%4]));
}
function overlap(a,b) { return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.5 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.5; }
function verify(model) {
  const issues=[];
  const segments=model.edges.flatMap(e=>e.points.slice(1).map((p,i)=>({id:e.id,a:e.points[i],b:p,ends:e.ends})));
  for(let i=0;i<segments.length;i++) for(let j=i+1;j<segments.length;j++) {
    const a=segments[i],b=segments[j];
    if(a.id!==b.id && intersect(a.a,a.b,b.a,b.b)) issues.push(`crossing/stacked edges ${a.id}, ${b.id}`);
  }
  for(const s of segments) for(const n of model.nodes) if(!s.ends.includes(n.id)&&hits(s.a,s.b,n)) issues.push(`edge ${s.id} crosses node ${n.id}`);
  for(let i=0;i<model.nodes.length;i++) for(let j=i+1;j<model.nodes.length;j++) if(overlap(model.nodes[i],model.nodes[j])) issues.push(`overlapping nodes ${model.nodes[i].id}, ${model.nodes[j].id}`);
  for(const l of model.labels) {
    for(const n of model.nodes) if(overlap(l,n)) issues.push(`label ${l.id} overlaps node ${n.id}`);
    for(const s of segments) if(s.id!==l.edge && hits(s.a,s.b,l)) issues.push(`edge ${s.id} crosses label ${l.id}`);
  }
  for(let i=0;i<model.labels.length;i++) for(let j=i+1;j<model.labels.length;j++) if(overlap(model.labels[i],model.labels[j])) issues.push(`overlapping labels ${model.labels[i].id}, ${model.labels[j].id}`);
  assert.deepEqual(issues,[]);
}
// Regression checks for both overlapping segments and shared actor endpoints.
assert(intersect({x:0,y:0},{x:10,y:0},{x:3,y:0},{x:8,y:0}));
assert(intersect({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}));
assert(intersect({x:0,y:0},{x:10,y:0},{x:5,y:0},{x:5,y:10}));
assert(!intersect({x:0,y:0},{x:10,y:10},{x:0,y:0},{x:10,y:-10}));

(async()=>{
  assert.equal(files.length,15);
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:2000,height:1900},deviceScaleFactor:1});
    await page.setContent('<html><body style="margin:0"><div id="graph"></div></body></html>');
    await page.addScriptTag({content:'window.mxLoadResources=false;window.mxLoadStylesheets=false;'});
    await page.addScriptTag({path:viewer});
    const results=[];
    for(const file of files) {
      const xml=fs.readFileSync(file,'utf8');
      const rendered=await page.evaluate(xml=>{
        document.getElementById('graph').replaceChildren();
        const graph=new Graph(document.getElementById('graph'));
        graph.setEnabled(false);
        const doc=mxUtils.parseXml(xml);
        new mxCodec(doc).decode(doc.getElementsByTagName('mxGraphModel')[0],graph.getModel());
        graph.view.validate();
        const cells=Object.values(graph.model.cells),nodes=[],edges=[],labels=[];
        for(const c of cells) {
          const s=graph.view.getState(c); if(!s)continue;
          if(c.edge) {
            const assertPoints=s.absolutePoints.filter(Boolean).map(p=>({x:p.x,y:p.y}));
            edges.push({id:c.id,ends:[c.source.id,c.target.id],points:assertPoints,paths:Array.from(s.shape.node.querySelectorAll('path')).map(n=>n.getAttribute('d'))});
          } else if(c.vertex && c.id!=='sys_boundary') {
            if(c.parent.edge) {
              const b=s.text.boundingBox; labels.push({id:c.id,edge:c.parent.id,x:b.x,y:b.y,w:b.width,h:b.height});
            } else {
              nodes.push({id:c.id,x:s.x,y:s.y,w:s.width,h:s.height});
              if(c.id.startsWith('uc_') && s.text) {
                const t=s.text.boundingBox;
                if(t.x<s.x||t.y<s.y||t.x+t.width>s.x+s.width||t.y+t.height>s.y+s.height)throw Error('Clipped use-case label: '+c.id);
              }
            }
          }
        }
        const boundary=graph.view.getState(graph.model.getCell('sys_boundary'));
        for(const n of nodes.filter(n=>n.id.startsWith('uc_'))) {
          if(n.x<boundary.x+59||n.y<boundary.y+54||n.x+n.w>boundary.x+boundary.width-59||n.y+n.h>boundary.y+boundary.height-49)throw Error('Boundary padding: '+n.id);
        }
        for(const n of nodes.filter(n=>n.id.startsWith('actor_')))if(n.x+n.w>=boundary.x)throw Error('Primary actor is not outside on the left');
        const svg=graph.getSvg('#ffffff',1,24);
        svg.setAttribute('content',xml);
        svg.setAttribute('data-renderer','Draw.io viewer-static');
        return {svg:mxUtils.getXml(svg),model:{nodes,edges,labels}};
      },xml);
      try {verify(rendered.model);} catch(e){e.message=path.basename(file)+': '+e.message;throw e;}
      fs.writeFileSync(file+'.svg',rendered.svg);
      const imagePage=await browser.newPage({viewport:{width:2100,height:2100},deviceScaleFactor:1});
      await imagePage.setContent('<html><body style="margin:0;display:inline-block">'+rendered.svg+'</body></html>');
      await imagePage.locator('svg').screenshot({path:file.replace(/\.drawio$/,'.png')});
      await imagePage.close();
      results.push({file:path.relative(base,file).replaceAll('\\','/'),nodes:rendered.model.nodes.length,edges:rendered.model.edges.length,labels:rendered.model.labels.length,crossings:0,overlappingSegments:0,edgeThroughNode:0,labelCollisions:0});
      console.log('PASS '+path.basename(file));
      fs.writeFileSync(path.join(base,'verification.json'),JSON.stringify({renderer:'Installed Draw.io viewer-static in headless Edge',checkedAt:new Date().toISOString(),passed:results.length===15,checks:['rendered edge crossings, T junctions and collinear overlaps','edges through unrelated nodes','labels against nodes, other labels and unrelated edges','use-case label clipping','dynamic system boundary padding','primary actors outside on left','all 15 diagrams rendered'],diagrams:results},null,2)+'\n');
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
