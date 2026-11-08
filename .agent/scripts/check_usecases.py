"""Check the primary use cases and parking lifecycle contracts."""
import json
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
    data = json.loads((BASE.parents[1] / '.agent/data/usecase_lifecycle.json').read_text())
    parking = [item for item in data['scenarios'] if item.get('parent') == 'UC06']
    assert {item['id'] for item in parking} == {'UC06-S1', 'UC06-S2', 'UC06-S3'}
    assert {item.get('legacy_id') for item in parking} == {None, 'UC06A', 'UC06B'}
    assert all(len(item['fields']) == 11 for item in [data['parking_use_case'], *data['scenarios']])
    print('Validated 14 primary IDs and three UC06 scenario contracts')
