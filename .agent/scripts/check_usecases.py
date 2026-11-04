"""Cross-format and business-goal checks for the simplified use-case model."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from usecase_model import CORE, SUPPLEMENTS, FIELDS

BASE = Path(__file__).resolve().parents[2] / '01_Diagram/01_Usecase_Diagram'


def check():
    native = [BASE/f'drawio/{role}_usecases.drawio' for role in ('user','operator')]
    assert set(native)==set(BASE.glob('drawio/*.drawio')), 'Keep only the User and Operator drawings'
    assert sorted(p.name for p in BASE.glob('*.md')) == ['README.md'], 'Keep one use-case Markdown document'
    labels, relations = set(), []
    occurrences = []
    for path in native:
        tree = ET.parse(path)
        assert len(tree.findall('diagram')) == 1, 'Each actor view has one canvas'
        cells = {c.get('id'):c for c in tree.iter('mxCell')}
        actors = [c.get('value') for key,c in cells.items() if key.startswith('actor_')]
        assert actors == [('User' if path.stem.startswith('user_') else 'Operator')], actors
        assert sum(key.startswith('uc_') and c.get('vertex')=='1' for key,c in cells.items()) == (15 if actors==['User'] else 12)
        for cid, cell in cells.items():
            if cid.startswith('uc_') and cell.get('vertex') == '1':
                label = ' '.join(cell.get('value','').split())
                labels.add(label)
                occurrences.append(label)
            if cell.get('edge') == '1':
                source,target = cells[cell.get('source')],cells[cell.get('target')]
                if 'dashed=1' in cell.get('style',''):
                    children = [c for c in cells.values() if c.get('parent')==cid and c.get('vertex')=='1']
                    assert len(children)==1, (path,'missing editable relationship label')
                    relations.append((source.get('value'),children[0].get('value'),target.get('value')))
        preview = path.parent.parent / 'svg' / (path.name+'.svg')
        embedded = ET.fromstring(ET.parse(preview).getroot().get('content'))
        assert ET.tostring(tree.getroot()) == ET.tostring(embedded), (path,'stale SVG editable content')
        assert (path.parent.parent/'png'/path.with_suffix('.png').name).exists()
    assert len(occurrences) == len(set(occurrences)) == 27, 'Each goal appears exactly once'
    core_goals={row[2] for row in CORE}
    lifecycle_goals={row[3] for row in SUPPLEMENTS}
    extras={'Cancel Vehicle Reservation','Cancel Parking Reservation','Cancel Charging Request',
            'Report Vehicle Damage','Override Charging Schedule','Export Simulation Results',
            'Apply Coordination Recommendations'}
    assert labels==core_goals|lifecycle_goals|extras, ('unexpected/missing goals',labels^(core_goals|lifecycle_goals|extras))
    assert set(relations)=={
      ('Run What-if Simulation','<<include>>','View Simulation Results'),
      ('Report Vehicle Damage','<<extend>>','Pick Up Vehicle'),
      ('Override Charging Schedule','<<extend>>','Manage Charging Schedule'),
      ('Export Simulation Results','<<extend>>','View Simulation Results'),
      ('Apply Coordination Recommendations','<<extend>>','View Simulation Results')}, relations
    source=(BASE/'README.md').read_text()
    assert source.count('@startuml')==source.count('@enduml')==2
    assert source.count('```mermaid')==2
    assert set(re.findall(r'usecase "([^"]+)"',source))==labels
    mermaid_labels={name.replace('<br/>',' ').replace('&amp;','&') for name in re.findall(r'\(\["([^"]+)"\]\)',source)}
    assert mermaid_labels==labels
    for dest in re.findall(r'\]\(([^)#]+)(?:#[^)]*)?\)',source):
        assert (BASE/dest).exists(), ('broken catalog link',dest)
    scenarios=source
    blocks=re.split(r'^## UC',scenarios,flags=re.M)[1:]
    assert len(blocks)==20
    for block in blocks:
        for field in FIELDS:
            assert f'| {field} |' in block, (block[:35],field)
    lifecycle=source
    for _,_,_,goal in SUPPLEMENTS:
        assert goal in lifecycle
    assert 'create ParkingReservation and hold a slot' in scenarios
    assert 'Phiếu Reserved → Fulfilled; slot Held → Occupied' in lifecycle
    print(f'PASS: {len(native)} native/SVG pairs; 27 distinct goals; 1 include + 4 extend; 20 complete core/lifecycle scenarios; all source links resolve.')


if __name__=='__main__':
    check()
