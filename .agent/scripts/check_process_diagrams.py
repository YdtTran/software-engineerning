"""Regression checks for AD/SC model semantics and the exported artifacts."""
import copy
import json
import xml.etree.ElementTree as ET
from generate_process_diagrams import ACTIVITIES, STATES, ACT, STA, flatten, check_activity, transition_label


def main():
    for folder,diagrams in ((ACT,ACTIVITIES),(STA,STATES)):
        report=json.loads((folder/'verification.json').read_text(encoding='utf-8'))
        assert report['passed'] and len(report['diagrams'])==len(diagrams)
        for d in diagrams:
            stem=d[0];file=folder/(stem+'.drawio')
            root=ET.parse(file).getroot();cells=list(root.iter('mxCell'))
            ids=[c.get('id') for c in cells];assert len(ids)==len(set(ids)),stem
            lookup={c.get('id'):c for c in cells}
            edges=[c for c in cells if c.get('edge')=='1']
            for e in edges:
                assert e.get('source') in lookup and e.get('target') in lookup
                assert e.find('mxGeometry').get('relative')=='1'
            svg=ET.parse(str(file)+'.svg').getroot()
            embedded=ET.fromstring(svg.get('content'))
            native_model=root.find('.//mxGraphModel')
            assert ET.tostring(native_model)==ET.tostring(embedded),stem+' native/SVG drift'
            assert (folder/(stem+'.png')).stat().st_size>1000
            assert (folder/(stem+'.puml')).read_text(encoding='utf-8').startswith('@startuml')
            mermaid=(folder/(stem+'.mmd')).read_text(encoding='utf-8')
            if folder==ACT:
                flatten.lanes=d[3];nodes,model_edges,_=flatten(d[4]);check_activity(nodes,model_edges)
                assert len(edges)==len(model_edges)
                actual={(e.get('source'),e.get('target')) for e in edges}
                assert actual=={(s,t) for s,t,_ in model_edges}
                assert sum(' --> ' in line or ' -.-> ' in line for line in mermaid.splitlines())==len(edges)
                for n in nodes:
                    assert lookup[n['id']].get('parent')==f'lane_{n["lane"]}'
                broken=copy.deepcopy(nodes);broken[0]['type']='end'
                try:check_activity(broken,model_edges)
                except AssertionError:pass
                else:raise AssertionError('Checker accepted a missing initial node')
            else:
                transitions=d[5];assert len(edges)==len(transitions)
                rendered=next(r for r in report['diagrams'] if r['file']==file.name)
                for e in rendered['model']['edges']:
                    assert all(abs(a['x']-b['x'])<.1 or abs(a['y']-b['y'])<.1 for a,b in zip(e['points'],e['points'][1:])),stem+' diagonal edge '+e['id']
                for i,t in enumerate(transitions):
                    assert lookup[f'e{i}'].get('data-contract')==transition_label(t),stem+' lost full contract'
                for s in d[4]:
                    body=lookup['body_'+s['id']]
                    assert body.get('value')=='\n'.join(s['actions'])
                    assert body.get('parent')==s['id']
                    assert lookup[s['id']].get('parent')==(s['group'] or '1')
                # All ordinary states are reachable, counting container transitions for each child.
                seen={'initial'}
                while True:
                    following=seen|{t[1] for t in transitions if t[0] in seen or any(s['id'] in seen and s['group']==t[0] for s in d[4])}
                    if following==seen:break
                    seen=following
                assert {s['id'] for s in d[4]}|{'final'}<=seen,stem
                for t in transitions:
                    if transition_label(t):assert transition_label(t) in mermaid
            print('PASS',stem,'source, native, SVG, PNG and catalogs')


if __name__=='__main__':main()
