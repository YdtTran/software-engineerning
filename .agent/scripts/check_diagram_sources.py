"""Validate the editable UML sources without requiring rendered exports."""
from pathlib import Path
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[2] / 'docs/diagrams'


def check(files):
    assert files, 'No Draw.io sources found'
    for file in files:
        tree = ET.parse(file)
        pages = tree.findall('diagram')
        assert pages, file
        for page in pages:
            root = page.find('mxGraphModel/root')
            assert root is not None, (file, page.get('name'))
            cells = [*root.findall('mxCell'), *root.findall('*/mxCell')]
            ids = [cell.get('id') or parent.get('id')
                   for parent in root
                   for cell in ([parent] if parent.tag == 'mxCell' else parent.findall('mxCell'))]
            assert None not in ids and len(ids) == len(set(ids)), (file, page.get('name'))
            assert {'0', '1'} <= set(ids), file
            for cell in cells:
                for key in ('parent', 'source', 'target'):
                    assert cell.get(key) is None or cell.get(key) in ids, (file, cell.attrib, key)
                if cell.get('edge') == '1':
                    geometry = cell.find('mxGeometry')
                    assert geometry is not None and geometry.get('relative') == '1', (file, cell.attrib)
    print(f'Validated {len(files)} editable Draw.io files')


if __name__ == '__main__':
    check(sorted(BASE.rglob('*.drawio')))
