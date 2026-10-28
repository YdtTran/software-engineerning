"""Standard-library sequence artifact regression checks."""
import argparse
import math
import copy
from pathlib import Path
import xml.etree.ElementTree as ET
from generate_slide_style_sequence import DIAGRAMS, layout, typed_name, message_label, catalog_block, text_width, line_height, header_lines, header_width, header_height, MESSAGE_SIZE, HEADER_SIZE

BASE = Path(__file__).resolve().parents[2] / '01_Diagram/02_Sequence_Diagram'
NS = '{http://www.w3.org/2000/svg}'


PALETTE = {'#dbeafe':'#93c5fd', '#e0f2fe':'#93c5fd', '#dcfce7':'#86efac',
           '#ffe4e6':'#fda4af', '#f3e8ff':'#d8b4fe', '#fef3c7':'#fcd34d'}


def category_size(id):
    return 22 if id == 'title' else 18 if id.startswith('header_') else 16 if id.startswith('label_') else 14


def contrast(fill):
    rgb = [int(fill[i:i+2], 16)/255 for i in (1,3,5)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return (sum(v*w for v,w in zip(linear, (.2126,.7152,.0722)))+.05)/.05


def style_issues(svg, model, d):
    issues = []
    def expect(id, key, actual, expected):
        if str(actual).lower() != str(expected).lower():
            issues.append(f'{id}: {key} {actual!r}, expected {expected}')
    def fill_for(id):
        if id == 'title_box': return '#93c5fd'
        if id.startswith(('p_', 'act_')): index = int(id.split('_')[1])
        elif id.startswith('nested_'): index = d['messages'][int(id.split('_')[1])]['src']
        else: return None
        return PALETTE[d['participants'][index]['fill']]
    def walk(node, inherited):
        effective = dict(inherited)
        effective.update(node.attrib)
        effective.update(item.split(':',1) for item in node.get('style','').split(';') if ':' in item)
        id = node.get('id', '')
        if node.tag in (NS+'text', NS+'tspan'):
            expect(id or 'tspan', 'text color', effective.get('fill', '#000000'), '#000000')
        if node.tag == NS+'text':
            expect(id, 'font size', effective.get('font-size'), category_size(id.removeprefix('text_')))
        fill = fill_for(id)
        if fill:
            expect(id, 'role fill', effective.get('fill'), fill)
            expect(id, 'box border', effective.get('stroke'), '#000000')
        if node.tag == NS+'rect' and id and not fill:
            expect(id, 'transparent label border', effective.get('stroke'), 'none')
        for child in node: walk(child, effective)
    expect('canvas', 'background', svg.find(NS+'rect').get('fill'), 'white')
    walk(svg, {})
    for cell in model.iter('mxCell'):
        id = cell.get('id','')
        style = dict(item.split('=',1) for item in cell.get('style','').split(';') if '=' in item)
        if cell.get('value'):
            expect(id, 'text color', style.get('fontColor', '#000000'), '#000000')
            expect(id, 'font size', style.get('fontSize'), category_size(id))
        fill = fill_for(id)
        if fill:
            expect(id, 'role fill', style.get('fillColor'), fill)
            expect(id, 'box border', style.get('strokeColor'), '#000000')
        elif cell.get('value'):
            expect(id, 'transparent label border', style.get('strokeColor'), 'none')
    for fill in set(PALETTE.values()):
        if contrast(fill) < 4.5: issues.append(f'{fill}: contrast below 4.5:1')
    return issues


def style_self_check():
    svg = ET.fromstring(f'<svg xmlns="{NS[1:-1]}" fill="#000000"><rect fill="white"/><rect id="p_0" fill="#d8b4fe" stroke="#000000"/><text id="text_label_0" font-size="16"><tspan>test</tspan></text></svg>')
    model = ET.fromstring('<root><mxCell id="p_0" style="fillColor=#d8b4fe;strokeColor=#000000;"/><mxCell id="label_0" value="test" style="fontSize=16;strokeColor=none;"/></root>')
    assert not style_issues(svg, model, DIAGRAMS[0])
    for target, attribute, value, reason in [('text','fill','#2563eb','text color'),('rect','stroke','#9333ea','box border'),('rect','fill','#f3e8ff','role fill'),('text','font-size','11','font size')]:
        bad = copy.deepcopy(svg); bad.find(NS+target+('[@id="p_0"]' if target=='rect' else '')).set(attribute, value)
        assert any(reason in issue for issue in style_issues(bad,model,DIAGRAMS[0])), reason
    for id, key, value, reason in [('label_0','fontColor','#2563eb','text color'),('p_0','strokeColor','#9333ea','box border'),('p_0','fillColor','#f3e8ff','role fill'),('label_0','fontSize','11','font size')]:
        bad = copy.deepcopy(model); c=bad.find(f"mxCell[@id='{id}']"); c.set('style',c.get('style')+f'{key}={value};')
        assert any(reason in issue for issue in style_issues(svg,bad,DIAGRAMS[0])), reason


def check(file):
    svg = ET.parse(file).getroot()
    model = ET.fromstring(svg.attrib['content'])
    d = next(d for d in DIAGRAMS if Path(d['filepath']).name == file.name)
    issues = style_issues(svg, model, d)
    for i, line in enumerate(svg.iter(NS + 'line')):
        # The baseline's ordinary arrows are the only lines without y2.
        for key in ('x1', 'y1', 'x2', 'y2'):
            if key not in line.attrib or not math.isfinite(float(line.get(key, 'nan'))):
                issues.append(f'line {i}: missing/nonfinite {key}')
        if line.get('data-kind') == 'message' and line.get('y1') != line.get('y2'):
            issues.append(f'line {i}: diagonal ordinary message')
    for cell in model.iter('mxCell'):
        if cell.get('edge') == '1':
            geo = cell.find('mxGeometry')
            if geo is None or geo.get('relative') != '1':
                issues.append(f'{cell.get("id")}: invalid relative edge geometry')
    if not issues:
        cells = {c.get('id'): c for c in model.iter('mxCell')}
        editable_text = {id for id,c in cells.items() if c.get('value')}
        preview_text = {t.get('id', '').removeprefix('text_') for t in svg.iter(NS+'text')}
        assert editable_text == preview_text, 'Preview/editable annotations differ'
        assert 'title' in preview_text, 'Missing diagram title'
        d = next(d for d in DIAGRAMS if Path(d['filepath']).name == file.name)
        centers, rows, labels, width, height = layout(d['participants'], d['messages'])
        for i,p in enumerate(d['participants']):
            assert cells[f'header_{i}'].get('value').replace('\n',' ') == typed_name(p)
        for p,ranges in d['active_ranges'].items():
            for j,(start,end) in enumerate(ranges):
                g=cells[f'act_{p}_{j}'].find('mxGeometry')
                assert float(g.get('y')) == rows[start]
                assert float(g.get('y'))+float(g.get('height')) == rows[end]
        for i,m in enumerate(d['messages']):
            assert any(e.get('id') == f'msg_{i}' for e in svg.iter()), f'Missing preview message {i}'
            assert cells[f'label_{i}'].get('value').replace('\n',' ') == message_label(i,m)
            style=cells[f'msg_{i}'].get('style')
            assert ('endArrow=open;' if m.get('is_resp') else 'endArrow=block;') in style
            if m.get('is_self'):
                g=cells[f'nested_{i}'].find('mxGeometry')
                assert float(g.get('y')) == rows[i]+24
                assert any(rows[start] <= rows[i] and rows[i]+40 < rows[end] for start,end in d['active_ranges'][m['src']])
        for id in ('title', 'duration', 'assumption'):
            if id not in cells:
                issues.append(f'missing editable {id}')
        for line in svg.findall(f'.//{NS}line[@data-kind="message"]'):
            id = line.get('id')
            geo = cells[id].find('mxGeometry')
            start = geo.find('mxPoint[@as="sourcePoint"]')
            end = geo.find('mxPoint[@as="targetPoint"]')
            if [float(line.get(k)) for k in ('x1','y1','x2','y2')] != [float(p.get(k)) for p in (start,end) for k in ('x','y')]:
                issues.append(f'{id}: SVG/model endpoint mismatch')
        for text in svg.iter(NS+'text'):
            id = text.get('id', '').removeprefix('text_')
            expected = '\n'.join(t.text or '' for t in text)
            if id not in cells or cells[id].get('value') != expected:
                issues.append(f'{id}: SVG/model label mismatch')
    return issues


def self_check():
    for d in DIAGRAMS:
        centers, rows, labels, width, height = layout(d['participants'], d['messages'])
        assert all(a < b for a,b in zip(rows, rows[1:]))
        for m, lines in zip(d['messages'], labels):
            if m.get('is_self'):
                assert centers[m['src']] + 54 + text_width(lines,MESSAGE_SIZE) <= width-24
        for p in d['participants']:
            assert header_width(p) >= text_width(header_lines(p),HEADER_SIZE)+24
            assert header_height(p) >= len(header_lines(p))*line_height(HEADER_SIZE)+24
        assert rows[-1] < height-48
    d = DIAGRAMS[0]
    msg = dict(d['messages'][0], text='a long ordinary message with many words ' * 8)
    centers, rows, labels, width, height = layout(d['participants'], [msg])
    assert len(labels[0]) > 5
    assert centers[1]-centers[0]-44 >= text_width(labels[0],MESSAGE_SIZE)
    assert rows[0]-len(labels[0])*line_height(MESSAGE_SIZE) > 190


if __name__ == '__main__':
    self_check()
    style_self_check()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', type=Path, default=BASE)
    args = parser.parse_args()
    catalog=args.directory/'PLANTUML_SEQUENCE.md'
    if catalog.exists():
        content=catalog.read_text(encoding='utf-8')
        for d in DIAGRAMS:
            for mermaid in (False,True):
                block=catalog_block(d,mermaid)
                assert block in content, f'Catalog differs from diagram data: {d["title"]}'
                balances={i:0 for i in range(len(d['participants']))}
                for line in block.splitlines():
                    line=line.strip()
                    if line.startswith(('activate ', 'deactivate ')):
                        op,p,*_=line.split();index=int(p[1:]);balances[index]+=1 if op=='activate' else -1
                        assert balances[index]>=0
                assert all(value==0 for value in balances.values())
    files = sorted(args.directory.glob('SQ*.drawio.svg'))
    assert len(files) == 7, f'Expected seven diagrams, found {len(files)}'
    count = 0
    for file in files:
        issues = check(file)
        count += len(issues)
        print(f'{file.name}: ' + ('PASS' if not issues else '; '.join(issues)))
    print(f'{count} defects across {len(files)} diagrams')
    raise SystemExit(bool(count))
