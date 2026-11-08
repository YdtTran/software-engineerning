"""Align overview canvases with the existing role goal catalogs."""
from pathlib import Path
import copy
import xml.etree.ElementTree as E
B=Path(__file__).resolve().parents[2]/'docs/diagrams/01_Usecase_Diagram'
roles=[]
for name in ('user','operator'):
 p=B/'drawio'/f'{name}_usecases.drawio'
 t=E.parse(p); roles.append(t)
 r=t.find('.//root')
 for c in list(r):
  if c.get('id','').startswith(('actor_telemetry','actor_notification','telemetry_','notification_')):r.remove(c)
 cells=list(t.iter('mxCell'))
 for c in cells:
  if c.get('id')=='actor_user': c.set('value','User')
 t.write(p,encoding='unicode')
# Compose the overall view from the exact role models, preserving all goal/relationship IDs.
t=copy.deepcopy(roles[0]); root=t.find('.//root')
for c in list(root):
 if c.get('id') not in ('0','1'): root.remove(c)
yoff=0
for role in roles:
 cells=list(role.iter('mxCell')); boundary=next(c for c in cells if c.get('id')=='sys_boundary'); bg=boundary.find('mxGeometry')
 for c in cells:
  if c.get('id') in ('0','1','sys_boundary'): continue
  c=copy.deepcopy(c); g=c.find('mxGeometry')
  if c.get('parent')=='sys_boundary':
   c.set('parent','1'); g.set('x',str(float(g.get('x','0'))+float(bg.get('x')))); g.set('y',str(float(g.get('y','0'))+float(bg.get('y'))+yoff))
  elif c.get('vertex')=='1' and c.get('id','').startswith('actor_'):
   g.set('y',str(float(g.get('y','0'))+yoff))
  root.append(c)
 yoff+=float(bg.get('height'))+100
ucs=[c for c in root if c.get('id','').startswith('uc_') and c.get('vertex')=='1']
xs=[float(c.find('mxGeometry').get('x')) for c in ucs]; ys=[float(c.find('mxGeometry').get('y')) for c in ucs]
x=min(xs)-60;y=min(ys)-55
w=max(float(c.find('mxGeometry').get('x'))+float(c.find('mxGeometry').get('width')) for c in ucs)+60-x
h=max(float(c.find('mxGeometry').get('y'))+float(c.find('mxGeometry').get('height')) for c in ucs)+50-y
boundary=copy.deepcopy(roles[0].find(".//mxCell[@id='sys_boundary']")); g=boundary.find('mxGeometry')
for k,v in dict(x=x,y=y,width=w,height=h).items():g.set(k,str(v))
root.insert(2,boundary)
t.find('diagram').set('name','Overall use cases')
t.write(B/'drawio/general_usecase_diagram.drawio',encoding='unicode')
print('Synced overall view: 25 goals from User and Operator catalogs.')
# Supporting systems remain outside each system boundary.
for name in ('user_usecases','operator_usecases','general_usecase_diagram'):
 p=B/'drawio'/f'{name}.drawio'; t=E.parse(p); r=t.find('.//root'); cells=list(r)
 b=next(c for c in cells if c.get('id')=='sys_boundary').find('mxGeometry')
 right=float(b.get('x'))+float(b.get('width'))+100
 mappings={'telemetry':('IoT / Simulated Telemetry',{'UC04','UC05','UC06','UC07','UC07A','UC08','UC10','UC10A','UC11','UC12'}),'notification':('Notification Service',{'UC03','UC06','UC11A'})}
 for key,(label,ids) in mappings.items():
  targets=[c for c in cells if c.get('vertex')=='1' and c.get('id','').removeprefix('uc_') in ids]
  if not targets:continue
  a=E.SubElement(r,'mxCell',id='actor_'+key,value=label,style='shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=0;',vertex='1',parent='1')
  E.SubElement(a,'mxGeometry',x=str(right),y=str(float(b.get('y'))+(180 if key=='telemetry' else float(b.get('height'))-160)),width='40',height='80',**{'as':'geometry'})
  for c in targets:
   edge=E.SubElement(r,'mxCell',id=key+'_'+c.get('id'),source=c.get('id'),target='actor_'+key,edge='1',parent='1',style='endArrow=none;startArrow=none;exitX=1;exitY=0.5;entryX=0;entryY=0.33;')
   E.SubElement(edge,'mxGeometry',relative='1',**{'as':'geometry'})
 t.write(p,encoding='unicode')
