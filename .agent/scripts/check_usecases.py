"""Check the primary use cases and parking lifecycle contracts."""
import json
import re
import xml.etree.ElementTree as ET

from check_diagram_sources import BASE, check


if __name__ == '__main__':
    folder = BASE / '01_Usecase_Diagram'
    overview = folder / 'drawio/system_use_cases.drawio'
    workflows = sorted(set(folder.rglob('*.drawio')) - {overview})
    assert all(path.name.startswith('workflow_') for path in workflows)
    check([overview, *workflows])
    assert len(workflows) == 6
    def relationships(path):
        return {
            (cell.get('id'), cell.get('value') or '', cell.get('parent'), cell.get('source'), cell.get('target'))
            for cell in ET.parse(path).iter('mxCell')
            if cell.get('id') not in {'0', '1', 'sys_boundary'}
        }

    assert relationships(overview) == set().union(*(relationships(path) for path in workflows))
    cases = {}
    for path in workflows:
        model = ET.parse(path)
        cells = {cell.get('id'): cell for cell in model.iter('mxCell')}
        for key, cell in cells.items():
            if key.startswith('uc_'):
                assert key not in cases, (path, key)
                cases[key] = cell.get('value')
        if path.stem == 'workflow_what_if_simulation':
            simulation = cells
    assert len(cases) == 25
    assert all(f'uc_UC{number:02}' in cases for number in range(1, 15))
    assert not {'uc_UC06A', 'uc_UC06B'} & cases.keys()
    assert cases['uc_UC06'] == 'Manage Parking Reservation'
    edge = simulation['uc13_include_uc14']
    assert (edge.get('source'), edge.get('target')) == ('uc_UC13', 'uc_UC14')
    label = simulation['uc13_include_uc14_label']
    assert label.get('parent') == edge.get('id') and label.get('value') == '<<include>>'
    for suffix in ('ext1', 'apply'):
        extension = simulation[f'extend_uc_UC14_uc_{suffix}']
        assert (extension.get('source'), extension.get('target')) == (f'uc_UC14_uc_{suffix}', 'uc_UC14')
        label = simulation[f'extend_uc_UC14_uc_{suffix}_lbl']
        assert label.get('parent') == extension.get('id') and label.get('value') == '<<extend>>'
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
