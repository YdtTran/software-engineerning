// Use the installed Draw.io renderer, including its real paths and text bounds.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.DRAWIO_PLAYWRIGHT || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const extensions = path.join(os.homedir(), '.vscode/extensions');
const extension = fs.readdirSync(extensions).filter(n=>n.startsWith('hediet.vscode-drawio-')).sort().at(-1);
const viewer = path.join(extensions,extension,'drawio/src/main/webapp/js/viewer-static.min.js');
const base = path.resolve(__dirname,'../../.diagram-exports');
const dirs = process.argv.includes('--statecharts-only') ? ['04_Statechart_Diagram'] : ['03_Activity_Diagram','04_Statechart_Diagram'];
function write(file,content) {
  // Atomic replacement also avoids transient locks from desktop SVG previews.
  fs.writeFileSync(file+'.tmp',content);fs.renameSync(file+'.tmp',file);
}
const overlap = (a,b) => Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.8 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.8;
function hits(a,b,r) {
  // Clip the segment against the open interior of a rectangle.
  let low=0,high=1;
  for(const [p,q,min,max] of [[a.x,b.x,r.x+.8,r.x+r.w-.8],[a.y,b.y,r.y+.8,r.y+r.h-.8]]) {
    if(Math.abs(q-p)<1e-7) {if(p<=min||p>=max)return false;}
    else {const t=[(min-p)/(q-p),(max-p)/(q-p)].sort((x,y)=>x-y);low=Math.max(low,t[0]);high=Math.min(high,t[1]);}
  }
  return high-low>1e-5;
}
function stacked(a,b,c,d) {
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  if(Math.abs(cross(a,b,c))>.01||Math.abs(cross(a,b,d))>.01)return false;
  const k=Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?'x':'y';
  return Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k]))-Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]))>.8;
}
assert(hits({x:0,y:5},{x:20,y:5},{x:5,y:0,w:10,h:10}));
assert(!hits({x:0,y:0},{x:20,y:0},{x:5,y:0,w:10,h:10}));
assert(stacked({x:0,y:0},{x:10,y:0},{x:5,y:0},{x:15,y:0}));
assert(!stacked({x:0,y:0},{x:10,y:0},{x:5,y:-5},{x:5,y:5}));

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:2000,height:1800}});
    await page.setContent('<html><body style="margin:0"><div id="graph"></div></body></html>');
    await page.addScriptTag({content:'window.mxLoadResources=false;window.mxLoadStylesheets=false;'});
    await page.addScriptTag({path:viewer});
    const markdownExtension=fs.readdirSync(extensions).filter(n=>n.startsWith('shd101wyy.markdown-preview-enhanced-')).sort().at(-1);
    const preview=await browser.newPage();
    await preview.setContent('<html><body></body></html>');
    await preview.addScriptTag({path:path.join(extensions,markdownExtension,'crossnote/dependencies/mermaid/mermaid.min.js')});
    await preview.evaluate(()=>mermaid.initialize({startOnLoad:false}));
    for(const dir of dirs) {
      const results=[];
      for(const name of fs.readdirSync(path.join(base,dir)).filter(n=>n.endsWith('.drawio')).sort()) {
        const file=path.join(base,dir,name);
        await preview.evaluate(async source=>{await mermaid.parse(source);},fs.readFileSync(file.replace(/\.drawio$/,'.mmd'),'utf8'));
        const xml=fs.readFileSync(file,'utf8');
        const rendered=await page.evaluate(xml=>{
          document.getElementById('graph').replaceChildren();
          const graph=new Graph(document.getElementById('graph'));graph.setEnabled(false);
          const doc=mxUtils.parseXml(xml);
          new mxCodec(doc).decode(doc.getElementsByTagName('mxGraphModel')[0],graph.model);
          graph.view.validate();
          // Graphviz places statechart labels in absolute canvas coordinates.
          for(const c of Object.values(graph.model.cells)) {
            if(c.vertex&&c.parent?.edge&&c.geometry&&!c.geometry.relative) {
              const p=graph.view.getState(c.parent).absoluteOffset;
              const g=c.geometry.clone(),x=g.x,y=g.y;
              g.relative=true;g.x=0;g.y=0;g.offset=new mxPoint(x-p.x,y-p.y);
              graph.model.setGeometry(c,g);
            }
          }
          graph.view.validate();
          const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.8&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.8;
          const segmentHits=(a,b,r)=>{
            let low=0,high=1;
            for(const [p,q,min,max] of [[a.x,b.x,r.x+.8,r.x+r.w-.8],[a.y,b.y,r.y+.8,r.y+r.h-.8]]) {
              if(Math.abs(q-p)<1e-7){if(p<=min||p>=max)return false;}
              else{const t=[(min-p)/(q-p),(max-p)/(q-p)].sort((x,y)=>x-y);low=Math.max(low,t[0]);high=Math.min(high,t[1]);}
            }
            return high-low>1e-5;
          };
          const all=Object.values(graph.model.cells);
          const box=s=>({x:s.x,y:s.y,w:s.width,h:s.height});
          const blockers=all.filter(c=>c.vertex&&!c.parent?.edge&&!c.id.startsWith('body_')&&c.id!=='title'&&(!graph.model.getChildVertices(c).length||graph.model.getChildVertices(c).some(x=>x.id.startsWith('body_')))).map(c=>box(graph.view.getState(c)));
          const labelCells=all.filter(c=>c.vertex&&c.parent?.edge);
          const edgeCells=all.filter(c=>c.edge);
          for(const c of labelCells) {
            const s=graph.view.getState(c),b=s.text.boundingBox;
            const others=labelCells.filter(x=>x!==c).map(x=>box(graph.view.getState(x).text.boundingBox));
            const segments=edgeCells.filter(e=>e!==c.parent).flatMap(e=>{
              const ps=graph.view.getState(e).absolutePoints.filter(Boolean);return ps.slice(1).map((p,i)=>[ps[i],p]);
            });
            const free=r=>!blockers.some(n=>overlaps(r,n))&&!others.some(n=>overlaps(r,n))&&!segments.some(([a,b])=>segmentHits(a,b,r));
            if(free(box(b)))continue;
            const ps=graph.view.getState(c.parent).absolutePoints.filter(Boolean);
            let target;
            for(let i=1;i<ps.length&&!target;i++)for(const fraction of [.5,.25,.75])for(const offset of [20,-20,35,-35,55,-55,85,-85,120,-120]) {
              if(target)break;
              const a=ps[i-1],z=ps[i],dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;
              const cx=a.x+dx*fraction-dy/len*offset,cy=a.y+dy*fraction+dx/len*offset;
              const candidate={x:cx-b.width/2,y:cy-b.height/2,w:b.width,h:b.height};
              if(free(candidate))target=candidate;
            }
            if(target){const g=c.geometry.clone();g.offset=g.offset||new mxPoint();g.offset.x+=target.x-b.x;g.offset.y+=target.y-b.y;graph.model.setGeometry(c,g);graph.view.validate();}
          }
          const nodes=[],edges=[],labels=[],clipped=[];
          for(const c of Object.values(graph.model.cells)) {
            const s=graph.view.getState(c);if(!s)continue;
            if(c.edge)edges.push({id:c.id,ends:[c.source.id,c.target.id],points:s.absolutePoints.filter(Boolean).map(p=>({x:p.x,y:p.y})),paths:Array.from(s.shape.node.querySelectorAll('path')).map(n=>n.getAttribute('d'))});
            else if(c.vertex&&c.parent?.edge) {
              if(s.text){const b=s.text.boundingBox;labels.push({id:c.id,edge:c.parent.id,x:b.x,y:b.y,w:b.width,h:b.height});}
            } else if(c.vertex&&!c.id.startsWith('body_')&&c.id!=='title'&&!graph.model.getChildVertices(c).length) {
              nodes.push({id:c.id,x:s.x,y:s.y,w:s.width,h:s.height});
              if(s.text){const b=s.text.boundingBox;if(b.x<s.x-2||b.y<s.y-2||b.x+b.width>s.x+s.width+2||b.y+b.height>s.y+s.height+2)clipped.push(c.id);}
            } else if(c.vertex&&c.id.startsWith('body_')) {
              const p=graph.view.getState(c.parent);nodes.push({id:c.parent.id,x:p.x,y:p.y,w:p.width,h:p.height});
              if(s.text){const b=s.text.boundingBox;if(b.x<p.x-2||b.y<p.y-2||b.x+b.width>p.x+p.width+2||b.y+b.height>p.y+p.height+2)clipped.push(c.id);}
            }
          }
          const output=mxUtils.getXml(new mxCodec().encode(graph.model));
          const svg=graph.getSvg('#ffffff',1,24);svg.setAttribute('content',output);svg.setAttribute('data-renderer','Draw.io viewer-static');
          return {svg:mxUtils.getXml(svg),xml:output,model:{nodes,edges,labels},clipped};
        },xml);
        const m=rendered.model,issues=[];
        const segments=m.edges.flatMap(e=>e.points.slice(1).map((p,i)=>({id:e.id,a:e.points[i],b:p})));
        for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++) {
          const a=segments[i],b=segments[j];if(a.id!==b.id&&stacked(a.a,a.b,b.a,b.b))issues.push(`stacked edges ${a.id}/${b.id}`);
        }
        for(let i=0;i<m.nodes.length;i++)for(let j=i+1;j<m.nodes.length;j++)if(overlap(m.nodes[i],m.nodes[j]))issues.push(`nodes ${m.nodes[i].id}/${m.nodes[j].id}`);
        for(const e of m.edges)for(let i=1;i<e.points.length;i++)for(const n of m.nodes)if(!e.ends.includes(n.id)&&hits(e.points[i-1],e.points[i],n))issues.push(`edge ${e.id} through ${n.id}`);
        for(const l of m.labels)for(const n of m.nodes)if(overlap(l,n))issues.push(`label ${l.id} on ${n.id}`);
        for(const l of m.labels)for(const e of m.edges)if(e.id!==l.edge)for(let i=1;i<e.points.length;i++)if(hits(e.points[i-1],e.points[i],l))issues.push(`edge ${e.id} through label ${l.id}`);
        for(let i=0;i<m.labels.length;i++)for(let j=i+1;j<m.labels.length;j++)if(overlap(m.labels[i],m.labels[j]))issues.push(`labels ${m.labels[i].id}/${m.labels[j].id}`);
        issues.push(...rendered.clipped.map(id=>'clipped '+id));
        // Persist the resolved label geometry so opening native XML matches the SVG.
        write(file,'<mxfile host="drawio"><diagram name="'+path.basename(file,'.drawio')+'">'+rendered.xml+'</diagram></mxfile>');
        write(file+'.svg',rendered.svg);
        const shot=await browser.newPage({viewport:{width:2000,height:1800}});
        await shot.setContent('<html><body style="margin:0;display:inline-block">'+rendered.svg+'</body></html>');
        await shot.locator('svg').screenshot({path:file.replace(/\.drawio$/,'.png')});await shot.close();
        results.push({file:name,nodes:m.nodes.length,edges:m.edges.length,labels:m.labels.length,issues,model:m});
        console.log(name+': '+(issues.length?issues.join('; '):'PASS'));
      }
      fs.writeFileSync(path.join(base,dir,'verification.json'),JSON.stringify({renderer:'Installed Draw.io viewer-static in headless Edge',checkedAt:new Date().toISOString(),passed:results.every(r=>!r.issues.length),checks:['Mermaid parser','node overlaps','stacked edge segments','edges through unrelated leaf nodes','labels against nodes, other labels and unrelated edge segments','leaf text containment','actual rendered paths and label coordinates'],diagrams:results},null,2)+'\n');
      assert(results.every(r=>!r.issues.length),'Rendered geometry checks failed in '+dir);
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
