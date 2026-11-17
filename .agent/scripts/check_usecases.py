"""Check the primary use cases and parking lifecycle contracts."""
import json
import re
import xml.etree.ElementTree as ET

from check_diagram_sources import BASE, check


if __name__ == '__main__':
    folder = BASE / '01_Usecase_Diagram'
    check(sorted(folder.rglob('*.drawio')))
    model = ET.parse(folder / 'drawio/general_usecase_diagram.drawio')
    cells = {cell.get('id'): cell for cell in model.iter('mxCell')}
    assert all(f'uc_UC{number:02}' in cells for number in range(1, 15))
    assert not {'uc_UC06A', 'uc_UC06B'} & cells.keys()
    assert cells['uc_UC06'].get('value') == 'Manage Parking Reservation'
    for filename in ('operator_usecases', 'general_usecase_diagram'):
        overview = ET.parse(folder / 'drawio' / f'{filename}.drawio')
        edge = overview.find(".//mxCell[@id='uc13_include_uc14']")
        assert edge is not None and (edge.get('source'), edge.get('target')) == ('uc_UC13', 'uc_UC14')
        label = overview.find(".//mxCell[@id='uc13_include_uc14_label']")
        assert label is not None and label.get('parent') == edge.get('id') and label.get('value') == '<<include>>'
    uc13 = ET.parse(folder / 'drawio/UC13-Run_What-if_Simulation.drawio')
    uc14 = ET.parse(folder / 'drawio/UC14-View_Simulation_Results.drawio')
    assert uc13.find(".//mxCell[@id='e7']").get('target') == 'uc_inc4'
    assert uc13.find(".//mxCell[@id='uc_ext1']") is None
    assert uc14.find(".//mxCell[@id='uc_ext2']").get('value').replace('\n', ' ') == 'Apply Coordination Recommendations'
    assert uc14.find(".//mxCell[@id='e3']").get('target') == 'uc_base'
    data = json.loads((BASE.parents[1] / '.agent/data/usecase_lifecycle.json').read_text())
    parking = [item for item in data['scenarios'] if item.get('parent') == 'UC06']
    assert {item['id'] for item in parking} == {'UC06-S1', 'UC06-S2', 'UC06-S3'}
    assert {item.get('legacy_id') for item in parking} == {None, 'UC06A', 'UC06B'}
    assert all(len(item['fields']) == 11 for item in [data['parking_use_case'], *data['scenarios']])
    core = (folder / 'CORE_SCENARIOS.md').read_text(encoding='utf-8')
    sections = dict(re.findall(r'^## (UC\d{2}) — [^\n]+\n(.*?)(?=^## |\Z)', core, re.M | re.S))
    assert set(sections) == {f'UC{number:02}' for number in range(1, 15)}
    for uid, section in sections.items():
        if uid == 'UC06':
            assert 'LIFECYCLE_SCENARIOS.md' in section
            continue
        fields = re.findall(r'^\| ([^|]+?) \|', section, re.M)
        assert fields[1:] == ['Use-case ID', 'Use-case name', 'Use-case overview', 'Actors', 'Trigger',
                              'Preconditions', 'Postconditions', 'Normal Flow', 'Alternative Flows',
                              'Exceptions', 'Notes and Issues'], uid
    print('Validated 14 primary IDs and three UC06 scenario contracts')
