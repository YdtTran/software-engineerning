// Native draw.io export and structural checks; uses the installed VS Code viewer.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const arg = process.argv.indexOf('--output-dir');
const root = path.resolve(__dirname,'../..');
const defaultOutput = path.join(root,'01_Diagram/05_Class_Diagram');
const base = arg < 0 ? defaultOutput : path.resolve(process.argv[arg+1]);
const scratch = base===defaultOutput ? path.join(root,'.agent/scratch/class_model') : path.join(base,'.scratch');
const reportFile = base===defaultOutput ? path.join(root,'.agent/verification/class-diagram.json') : path.join(scratch,'class-verification.json');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  const extensionRoot = path.join(os.homedir(), '.vscode/extensions');
  const extension = (fs.existsSync(extensionRoot) ? fs.readdirSync(extensionRoot) : []).filter(n => n.startsWith('hediet.vscode-drawio-')).sort().at(-1);
  assert(process.env.DRAWIO_VIEWER || extension, 'Missing VS Code draw.io viewer; set DRAWIO_VIEWER');
  const viewer = process.env.DRAWIO_VIEWER || path.join(extensionRoot, extension || '', 'drawio/src/main/webapp/js/viewer-static.min.js');
  assert(fs.existsSync(viewer), 'Missing draw.io viewer; set DRAWIO_VIEWER');
  let playwright;
  try { playwright = require(process.env.DRAWIO_PLAYWRIGHT || 'playwright'); }
  catch { throw new Error('Missing Playwright; set DRAWIO_PLAYWRIGHT to an installed module path'); }
  const {chromium} = playwright;
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:2000,height:1000},deviceScaleFactor:1});
    await page.setContent('<html><body style="margin:0"><div id="graph"></div></body></html>');
    await page.addScriptTag({content:'window.mxLoadResources=false;window.mxLoadStylesheets=false;'});
    await page.addScriptTag({path:viewer});
    const xml = fs.readFileSync(path.join(scratch, 'model.drawio'), 'utf8');
    const inspectGraph = xml => {
      const graph = new Graph(document.getElementById('graph'));
      graph.setEnabled(false);
      const doc = mxUtils.parseXml(xml);
      new mxCodec().decode(doc.getElementsByTagName('mxGraphModel')[0], graph.model);
      graph.view.validate();
      const cells = Object.values(graph.model.cells);
      const classIds = new Map([...(doc.querySelector('diagram') || doc).querySelectorAll('mxCell[data-class]')].map(c=>[c.id,c.getAttribute('data-class')]));
      const classes = cells.filter(c => classIds.has(c.id));
      const data = {classes:classes.map(c=>({id:c.id,name:classIds.get(c.id)})),edges:cells.filter(c=>c.edge).map(c=>({id:c.id,source:c.source.id,target:c.target.id})),issues:[],labels:[],segments:[]};
      const box = b => ({x:b.x,y:b.y,w:b.width,h:b.height});
      const intersect = (a,b) => Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
      for (const c of cells.filter(c=>c.vertex)) {
        const state = graph.view.getState(c);
        if(!state)continue;
        const bounds = state.text?.boundingBox;
        if(c.value && bounds) {
          const rect = box(bounds);
          data.labels.push({id:c.id,parent:c.parent?.id,text:c.value,...rect});
          if(c.parent?.edge)continue;
          if(bounds.x<state.x-1 || bounds.y<state.y-1 || bounds.x+bounds.width>state.x+state.width+1 || bounds.y+bounds.height>state.y+state.height+1) data.issues.push('clipped text '+c.id);
        }
      }
      const nodes = classes.map(c=>({id:c.id,...box(graph.view.getState(c))}));
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(intersect(nodes[i],nodes[j]))data.issues.push('node overlap '+nodes[i].id+'/'+nodes[j].id);
      // No class/connector intersection, except a connector's own terminals.
      const crosses = (a,b,r) => {
        let lo=0,hi=1;
        for(const [p,q] of [[-(b.x-a.x),a.x-r.x],[b.x-a.x,r.x+r.w-a.x],[-(b.y-a.y),a.y-r.y],[b.y-a.y,r.y+r.h-a.y]]) {
          if(Math.abs(p)<1e-8){if(q<0)return false;continue;}
          const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
        }
        return lo<hi;
      };
      for(const c of cells.filter(c=>c.edge)) {
        const pts=graph.view.getState(c).absolutePoints.filter(Boolean);
        for(let i=1;i<pts.length;i++) {
          const a=pts[i-1],b=pts[i];
          if(Math.hypot(a.x-b.x,a.y-b.y)>.1)data.segments.push({id:c.id,target:c.target.id,a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}});
          if(Math.abs(a.x-b.x)>.2 && Math.abs(a.y-b.y)>.2)data.issues.push('non-orthogonal segment '+c.id);
        }
        for(const n of nodes.filter(n=>n.id!==c.source.id && n.id!==c.target.id)) {
          const inner={x:n.x+2,y:n.y+2,w:n.w-4,h:n.h-4};
          if(pts.slice(1).some((b,i)=>crosses(pts[i],b,inner)))data.issues.push('connector crosses node '+c.id+'/'+n.id);
        }
      }
      for(let i=0;i<data.segments.length;i++)for(let j=i+1;j<data.segments.length;j++) {
        const a=data.segments[i],b=data.segments[j];
        if(a.id===b.id || a.id.startsWith('g') && b.id.startsWith('g') && a.target===b.target)continue;
        const ah=Math.abs(a.a.y-a.b.y)<.2,bh=Math.abs(b.a.y-b.b.y)<.2;
        if(ah===bh) {
          const coord=ah?'y':'x',axis=ah?'x':'y';
          const length=Math.min(Math.max(a.a[axis],a.b[axis]),Math.max(b.a[axis],b.b[axis]))-Math.max(Math.min(a.a[axis],a.b[axis]),Math.min(b.a[axis],b.b[axis]));
          if(Math.abs(a.a[coord]-b.a[coord])<.2 && length>1)data.issues.push('stacked connectors '+a.id+'/'+b.id);
        } else {
          const h=ah?a:b,v=ah?b:a;
          if(v.a.x>Math.min(h.a.x,h.b.x)+1 && v.a.x<Math.max(h.a.x,h.b.x)-1 && h.a.y>Math.min(v.a.y,v.b.y)+1 && h.a.y<Math.max(v.a.y,v.b.y)-1)data.issues.push('connector crossing '+a.id+'/'+b.id);
        }
      }
      for(const l of data.labels)for(const s of data.segments) {
        if(l.parent===s.id)continue;
        if(crosses(s.a,s.b,{x:l.x+1,y:l.y+1,w:l.w-2,h:l.h-2}))data.issues.push('connector crosses label '+s.id+'/'+l.id);
      }
      for(let i=0;i<data.labels.length;i++)for(let j=i+1;j<data.labels.length;j++)if(intersect(data.labels[i],data.labels[j]))data.issues.push('label overlap '+data.labels[i].id+'/'+data.labels[j].id);
      for(const name of ['ElectricVehicle','Reservation']) {
        if(graph.model.getCell(name+'_title') && !(Number(graph.view.getState(graph.model.getCell(name+'_title')).style.fontStyle)&2))data.issues.push('missing abstract italics '+name);
      }
      const abstractOp=graph.model.getCell('Reservation_op1');
      if(abstractOp && !(Number(graph.view.getState(abstractOp).style.fontStyle)&2))data.issues.push('missing abstract operation italics');
      // Export exactly the graph checked above, then embed the editable source.
      const svg=graph.getSvg('#ffffff',1,20);
      svg.setAttribute('content',xml);
      data.svg=new XMLSerializer().serializeToString(svg);
      return data;
    };
    const model = await page.evaluate(inspectGraph, xml);
    assert.equal(new Set(model.classes.map(c=>c.name)).size,19);
    assert.equal(model.classes.length,38);
    assert.equal(model.edges.length,35);
    fs.writeFileSync(path.join(scratch,'verification.json'),JSON.stringify({...model,svg:undefined},null,2));

    await page.setContent('<html><body style="margin:0">'+model.svg+'</body></html>');
    const svg = page.locator('svg');
    const dimensions = await svg.evaluate(n=>({w:parseFloat(n.getAttribute('width')),h:parseFloat(n.getAttribute('height'))}));
    await page.setViewportSize({width:Math.ceil(dimensions.w),height:Math.ceil(dimensions.h)});
    await svg.screenshot({path:path.join(scratch,'class_diagram.png')});
    // Browser resizes the verified SVG for the navigation thumbnail; no image library required.
    await svg.evaluate(n => { const ratio=2000/parseFloat(n.getAttribute('width')); n.setAttribute('height',parseFloat(n.getAttribute('height'))*ratio); n.setAttribute('width',2000); });
    await svg.screenshot({path:path.join(base,'png/smart_emobility_class_diagram.png')});
    // Decode the embedded graph again: counts, members and editable edge labels survive reopening.
    const reopened=await page.evaluate(()=>{
      const xml=document.querySelector('svg').getAttribute('content');
      const doc=new DOMParser().parseFromString(xml,'text/xml');
      const first=doc.querySelector('diagram');
      return {errors:doc.querySelectorAll('parsererror').length,classes:first.querySelectorAll('mxCell[data-class]').length,
        edges:first.querySelectorAll('mxCell[edge="1"]').length,labels:first.querySelectorAll('mxCell[style*="edgeLabel"]').length,pages:doc.querySelectorAll('diagram').length};
    });
    assert.deepEqual(reopened,{errors:0,classes:38,edges:35,labels:93,pages:9});
    assert.deepEqual(model.issues,[]);
    // Render the numbered native tabs as separate readable PNGs, using no embedded XML.
    const previews=path.join(base,'png');
    fs.mkdirSync(previews,{recursive:true});
    const detail=await page.evaluate(xml=>{
      const doc=mxUtils.parseXml(xml);
      return [...doc.querySelectorAll('diagram')].slice(1).map(p=>({id:p.id,xml:new XMLSerializer().serializeToString(p)}));
    },xml);
    let detailClasses=0,detailEdges=0;
    const perView=[];
    for(const d of detail) {
      await page.setContent('<html><body style="margin:0"><div id="graph"></div></body></html>');
      const result=await page.evaluate(inspectGraph,d.xml);
      assert.deepEqual(result.issues,[], 'Geometry issues in '+d.id);
      perView.push({id:d.id,classes:result.classes.length,edges:result.edges.length,issues:result.issues});
      detailClasses+=result.classes.length;detailEdges+=result.edges.length;
      await page.setContent('<html><body style="margin:0">'+result.svg+'</body></html>');
      await page.locator('svg').screenshot({path:path.join(previews,d.id+'.png')});
    }
    assert.equal(detailClasses,38);assert.equal(detailEdges,35);
    fs.mkdirSync(path.dirname(reportFile),{recursive:true});
    const fingerprints=Object.fromEntries(['CLASS_CATALOG.md','build_class_diagram.py','render_class_diagram.cjs'].map(name=>[name,digest(path.join(__dirname,name))]));
    const artifacts=Object.fromEntries(['drawio/smart_emobility_class_diagram.drawio',...fs.readdirSync(path.join(base,'png')).filter(n=>n.endsWith('.png')).map(n=>'png/'+n)].map(name=>[name,digest(path.join(base,name))]));
    fs.writeFileSync(reportFile,JSON.stringify({fingerprints,artifacts,generatedAt:new Date().toISOString(),canonical:{classes:19,operations:18,generalizations:4,associations:31},compact:{occurrences:38,maxAttributes:3,maxOperations:2},overview:{issues:model.issues},views:perView,tools:{viewer,playwright:process.env.DRAWIO_PLAYWRIGHT || 'playwright'},status:'passed'},null,2));
    console.log('PASS: 19 domain classes, 38 occurrences, 35 relations across eight views; no clipping, stacked connectors, crossings or label collisions; native XML parsed');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
