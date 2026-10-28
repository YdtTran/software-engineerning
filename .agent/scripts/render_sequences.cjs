// Sequence crossings with lifelines are intentional; message stacking is not.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

function overlap(a,b) {
  return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.5 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.5;
}
function hits(a,b,r) {
  if (Math.abs(a.y-b.y)<.1) return a.y>r.y+.5 && a.y<r.y+r.h-.5 && Math.min(Math.max(a.x,b.x),r.x+r.w)-Math.max(Math.min(a.x,b.x),r.x)>.5;
  if (Math.abs(a.x-b.x)<.1) return a.x>r.x+.5 && a.x<r.x+r.w-.5 && Math.min(Math.max(a.y,b.y),r.y+r.h)-Math.max(Math.min(a.y,b.y),r.y)>.5;
  throw Error('Non-orthogonal segment');
}
const fills=['rgb(147, 197, 253)','rgb(134, 239, 172)','rgb(253, 164, 175)','rgb(216, 180, 254)','rgb(252, 211, 77)'];
const black='rgb(0, 0, 0)';
function verify(model) {
  const issues=[];
  for(const l of model.labels) {
    const id=l.id.replace(/^text_/, '');
    const size=id==='title'?22:id.startsWith('header_')?18:id.startsWith('label_')?16:14;
    if(!l.parts.length)issues.push(`missing rendered text styles ${l.id}`);
    for(const part of l.parts) {
      if(part.color!==black) issues.push(`text color ${l.id}: ${part.color}`);
      if(part.fontSize!==size) issues.push(`font size ${l.id}: ${part.fontSize}`);
    }
    const box=model.bounds.find(b=>b.id===(id==='title'?'title_box':id.replace('header_', 'p_')));
    if(box && !box.actor && (l.x<box.x-.5 || l.y<box.y-.5 || l.x+l.w>box.x+box.w+.5 || l.y+l.h>box.y+box.h+.5)) issues.push(`header containment ${l.id}`);
  }
  for(const b of model.boxes) {
    if(b.stroke!==black) issues.push(`box border ${b.id}: ${b.stroke}`);
    if(!fills.includes(b.fill)) issues.push(`role fill ${b.id}: ${b.fill}`);
  }
  for(const r of model.transparent) if(r.fill!=='none'||r.stroke!=='none') issues.push(`visible label rectangle ${r.id}`);
  const segments=model.edges.filter(e=>e.id.startsWith('msg_')).flatMap(e=>{
    const points=e.drawnPoints || e.points;
    return points.slice(1).map((p,i)=>({id:e.id,a:points[i],b:p}));
  });
  for(const e of model.edges.filter(e=>e.id.startsWith('msg_'))) {
    const points=e.drawnPoints || e.points;
    if(e.points.length===2)assert(points.every(p=>Math.abs(p.y-points[0].y)<.1),'Diagonal ordinary path '+e.id);
  }
  for(let i=0;i<segments.length;i++) for(let j=i+1;j<segments.length;j++) {
    const a=segments[i],b=segments[j];
    if(a.id===b.id)continue;
    if(Math.abs(a.a.y-a.b.y)<.1 && Math.abs(b.a.y-b.b.y)<.1 && Math.abs(a.a.y-b.a.y)<.1 && Math.min(Math.max(a.a.x,a.b.x),Math.max(b.a.x,b.b.x))-Math.max(Math.min(a.a.x,a.b.x),Math.min(b.a.x,b.b.x))>.5) issues.push(`stacked ${a.id}, ${b.id}`);
  }
  for(const l of model.labels) {
    for(const a of model.activations) if(overlap(l,a)) issues.push(`label ${l.id} intersects activation ${a.id}`);
    for(const s of segments) if(hits(s.a,s.b,l)) issues.push(`message ${s.id} intersects label ${l.id}`);
  }
  for(let i=0;i<model.labels.length;i++) for(let j=i+1;j<model.labels.length;j++) if(overlap(model.labels[i],model.labels[j])) issues.push(`labels ${model.labels[i].id}, ${model.labels[j].id} overlap`);
  for(const r of [...model.labels,...model.activations,...model.bounds]) if(r.x<23.5 || r.y<23.5 || r.x+r.w>model.width-23.5 || r.y+r.h>model.height-23.5) issues.push(`clipped/outer clearance ${r.id}`);
  for(const e of model.edges) for(const p of e.points) if(p.x<24||p.y<24||p.x>model.width-24||p.y>model.height-24) issues.push(`clipped edge ${e.id}`);
  assert.deepEqual(issues,[]);
}
function selfCheck() {
  const label={id:'label_0',x:30,y:30,w:20,h:10,parts:[{color:black,fontSize:16}]};
  const box={id:'p_1',x:30,y:30,w:50,h:30,stroke:black,fill:fills[0]};
  const fixture={width:160,height:160,edges:[{id:'msg_0',points:[{x:24,y:80},{x:136,y:80}]},{id:'line_0',points:[{x:80,y:24},{x:80,y:136}]}],labels:[],activations:[],bounds:[],boxes:[],transparent:[]};
  verify(fixture); // Intended message/lifeline crossing.
  verify({...fixture,labels:[label],boxes:[box]});
  assert.throws(()=>verify({...fixture,edges:[...fixture.edges,{id:'msg_1',points:[{x:30,y:80},{x:100,y:80}]}]}),/stacked/);
  assert.throws(()=>verify({...fixture,labels:[label],activations:[{id:'act',x:40,y:30,w:12,h:30}]}),/activation/);
  assert.throws(()=>verify({...fixture,labels:[{...label,x:10}]}),/clearance/);
  assert.throws(()=>verify({...fixture,labels:[{...label,y:75}]}),/intersects label/);
  assert.throws(()=>verify({...fixture,labels:[{...label,parts:[{color:'rgb(0, 0, 255)',fontSize:16}]}]}),/text color/);
  assert.throws(()=>verify({...fixture,labels:[{...label,parts:[{color:black,fontSize:11}]}]}),/font size/);
  assert.throws(()=>verify({...fixture,boxes:[{...box,stroke:'rgb(0, 0, 255)'}]}),/box border/);
  assert.throws(()=>verify({...fixture,boxes:[{...box,fill:'rgb(219, 234, 254)'}]}),/role fill/);
  assert.throws(()=>verify({...fixture,labels:[{...label,id:'header_1',w:60,parts:[{color:black,fontSize:18}]}],bounds:[box]}),/containment/);
  assert.throws(()=>verify({...fixture,transparent:[{id:'label_0',fill:'none',stroke:black}]}),/visible label/);
}

async function main() {
  selfCheck();
  if(process.argv.includes('--self-test')) {console.log('PASS renderer negative fixtures and allowed lifeline crossing'); return;}
  const base=path.resolve(process.argv[2] || path.join(__dirname,'../../01_Diagram/02_Sequence_Diagram'));
  const record=path.join(base,'verification.json');
  const report={renderer:'Installed Draw.io viewer-static / Playwright / headless Edge',sourceDirectory:base,checkedAt:new Date().toISOString(),passed:false,diagrams:[]};
  fs.writeFileSync(record,JSON.stringify(report,null,2)+'\n');
  let browser;
  try {
    const extensionRoot=path.join(os.homedir(),'.vscode/extensions');
    const extension=fs.existsSync(extensionRoot) && fs.readdirSync(extensionRoot).filter(n=>n.startsWith('hediet.vscode-drawio-')).sort().at(-1);
    const viewer=process.env.DRAWIO_VIEWER || (extension && path.join(extensionRoot,extension,'drawio/src/main/webapp/js/viewer-static.min.js'));
    if(!viewer || !fs.existsSync(viewer))throw Error('Draw.io viewer unavailable: install the VS Code Draw.io extension or set DRAWIO_VIEWER to viewer-static.min.js');
    report.viewer=viewer;
    const {chromium}=require(process.env.DRAWIO_PLAYWRIGHT || path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
    const files=fs.readdirSync(base).filter(n=>/^SQ0[1-7]-.+\.drawio\.svg$/.test(n)).sort();
    assert.equal(files.length,7);
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage({viewport:{width:2400,height:2000},deviceScaleFactor:1});
    await page.setContent('<html><body style="margin:0"><div id="graph"></div></body></html>');
    await page.addScriptTag({content:'window.mxLoadResources=false;window.mxLoadStylesheets=false;'});
    await page.addScriptTag({path:viewer});
    for(const file of files) {
      const source=fs.readFileSync(path.join(base,file),'utf8');
      const preview=await browser.newPage({viewport:{width:2400,height:2000},deviceScaleFactor:1});
      await preview.setContent('<html><body style="margin:0">'+source+'</body></html>');
      await preview.evaluate(()=>document.fonts.ready);
      const svgModel=await preview.evaluate(()=>{
        const svg=document.querySelector('svg');
        const rect=n=>{const b=n.getBBox();return {id:n.id,x:b.x,y:b.y,w:b.width,h:b.height}};
        const paint=n=>{const s=getComputedStyle(n);return {fill:s.fill,stroke:s.stroke}};
        const label=n=>({...rect(n),parts:[n,...n.querySelectorAll('tspan')].map(p=>({color:getComputedStyle(p).fill,fontSize:parseFloat(getComputedStyle(p).fontSize)}))});
        const points=n=>n.tagName==='line'?[{x:+n.getAttribute('x1'),y:+n.getAttribute('y1')},{x:+n.getAttribute('x2'),y:+n.getAttribute('y2')}]:Array.from(n.getAttribute('d').matchAll(/(?:M|L)\s*([\d.]+)\s+([\d.]+)/g),m=>({x:+m[1],y:+m[2]}));
        return {width:+svg.getAttribute('width'),height:+svg.getAttribute('height'),labels:Array.from(svg.querySelectorAll('text'),label),activations:Array.from(svg.querySelectorAll('[id^="act_"],[id^="nested_"]'),rect),bounds:Array.from(svg.querySelectorAll('[id^="p_"],#title_box'),n=>({...rect(n),actor:n.tagName==='g'})),boxes:Array.from(svg.querySelectorAll('[id^="p_"],[id^="act_"],[id^="nested_"],#title_box'),n=>({...rect(n),...paint(n)})),transparent:Array.from(svg.querySelectorAll('rect[id]')).filter(n=>! /^(p_|act_|nested_|title_box)/.test(n.id)).map(n=>({id:n.id,...paint(n)})),edges:Array.from(svg.querySelectorAll('[data-kind]'),n=>({id:n.id,points:points(n)}))};
      });
      try {verify(svgModel);}catch(e){throw Error(file+' SVG: '+e.message);}
      const rendered=await page.evaluate(source=>{
        const svg=mxUtils.parseXml(source).documentElement;
        const xml=svg.getAttribute('content');
        const width=+svg.getAttribute('width'),height=+svg.getAttribute('height');
        const render=xml=>{
          document.getElementById('graph').replaceChildren();
          const graph=new Graph(document.getElementById('graph'));graph.setEnabled(false);
          const doc=mxUtils.parseXml(xml);
          new mxCodec(doc).decode(doc.getElementsByTagName('mxGraphModel')[0],graph.model);
          graph.view.validate();
          const model={width,height,edges:[],labels:[],activations:[],bounds:[],boxes:[],transparent:[]};
          for(const c of Object.values(graph.model.cells)) {
            const s=graph.view.getState(c);if(!s)continue;
            const r={id:c.id,x:s.x,y:s.y,w:s.width,h:s.height};
            if(c.edge) {
              const paths=Array.from(s.shape.node.querySelectorAll('path')).map(n=>n.getAttribute('d'));
              if(!paths.length)throw Error('Missing rendered path '+c.id);
              const line=paths[0];
              if(/[^MLml\d\s.,+\-]/.test(line))throw Error('Unexpected path commands '+c.id+': '+line);
              const coords=Array.from(line.matchAll(/[-+]?\d*\.?\d+/g),m=>+m[0]);
              const drawnPoints=[];
              for(let i=0;i<coords.length;i+=2)drawnPoints.push({x:coords[i],y:coords[i+1]});
              model.edges.push({id:c.id,points:s.absolutePoints.filter(Boolean).map(p=>({x:p.x,y:p.y})),drawnPoints,paths});
            } else if(c.vertex) {
              if(c.id.startsWith('act_')||c.id.startsWith('nested_'))model.activations.push(r);
              if(c.id.startsWith('p_')||c.id==='title_box')model.bounds.push({...r,actor:s.style.shape==='umlActor'});
              const paintNode=s.shape.node.querySelector('[fill]:not([fill="none"])');
              if(/^(p_|act_|nested_|title_box)/.test(c.id)) {
                if(!paintNode)throw Error('Missing rendered box '+c.id);
                const css=getComputedStyle(paintNode);
                model.boxes.push({...r,fill:css.fill,stroke:css.stroke});
              } else {
                const nodes=Array.from(s.shape.node.querySelectorAll('path,rect'));
                for(const node of nodes) {const css=getComputedStyle(node);if(css.visibility!=='hidden' && +css.opacity!==0)model.transparent.push({id:c.id,fill:css.fill,stroke:css.stroke});}
              }
              if(s.text) {const b=s.text.boundingBox;if(!b)throw Error('Missing text bounds '+c.id);model.labels.push({id:c.id,x:b.x,y:b.y,w:b.width,h:b.height,value:c.value,parts:Array.from(s.text.node.querySelectorAll('*')).filter(n=>Array.from(n.childNodes).some(t=>t.nodeType===3 && t.textContent.trim())).map(n=>({color:n.namespaceURI==='http://www.w3.org/2000/svg'?getComputedStyle(n).fill:getComputedStyle(n).color,fontSize:parseFloat(getComputedStyle(n).fontSize)}))});}
            }
          }
          const saved=mxUtils.getXml(new mxCodec().encode(graph.model));
          return {model,saved};
        };
        const first=render(xml);
        const reopened=render(first.saved);
        return {first:first.model,reopened:reopened.model,saved:first.saved};
      },source);
      try {verify(rendered.first);verify(rendered.reopened);assert.deepEqual(rendered.first,rendered.reopened);
        for(const b of svgModel.boxes) {const other=rendered.first.boxes.find(r=>r.id===b.id);assert.equal(other.fill,b.fill,b.id+' fill parity');assert.equal(other.stroke,b.stroke,b.id+' border parity');}
      }catch(e){throw Error(file+' draw.io: '+e.message);}
      // Compare rendered message endpoints as well as checking the shared source XML.
      for(const e of svgModel.edges.filter(e=>e.id.startsWith('msg_'))) {
        const modelEdge=rendered.first.edges.find(m=>m.id===e.id);
        assert.deepEqual(modelEdge.points,e.points,file+' endpoint parity '+e.id);
      }
      await preview.locator('svg').screenshot({path:path.join(base,file.replace('.drawio.svg','.png'))});
      await preview.close();
      report.diagrams.push({file,passed:true,preview:'SVG DOM getBBox and path segments',editable:'draw.io rendered text bounds and paths',saveReopen:true,messages:svgModel.edges.filter(e=>e.id.startsWith('msg_')).length,clipping:0,stackedMessages:0,labelCollisions:0,style:true,headerContainment:true,outerClearance:24});
      console.log('PASS '+file+' (SVG, draw.io, save/reopen)');
    }
    report.passed=report.diagrams.length===7;
  } catch(e) {report.error=e.message;throw e;}
  finally {fs.writeFileSync(record,JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
