"""Regenerate class sources/graph; stdlib + installed drawio-skill + dot.

Run from any directory. render_class_diagram.cjs renders the native graph as PNG views.
The catalog remains the single source for selected members and relationships.
"""
import argparse
import hashlib
import os
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
DEFAULT_OUTPUT = ROOT / '.diagram-exports/class'
SCRATCH = ROOT / '.agent/scratch/class_model'
OUTPUT = DEFAULT_OUTPUT
CATALOG = (BASE / 'CLASS_CATALOG.md').read_text(encoding='utf-8')
ABSTRACT = {'ElectricVehicle', 'Reservation'}
ABSTRACT_METHOD = ('Reservation', '+calculateExpiry() : DateTime')


def read_model():
    classes = {}
    for name, body in re.findall(r'^### (\w+)\n```text\n(.*?)\n```', CATALOG, re.M | re.S):
        attrs, ops = body.split('--')
        classes[name] = (attrs.strip().splitlines() if attrs.strip() else [],
                         ops.strip().splitlines() if ops.strip() else [])
    generalizations = re.findall(r'^\| (\w+) \| (ElectricVehicle|Reservation) \| Every ', CATALOG, re.M)
    associations = []
    for row in CATALOG.splitlines():
        fields = [s.strip() for s in row.strip('|').split('|')]
        if len(fields) == 7 and fields[-1] in ('association', 'composition'):
            associations.append(fields)
    return classes, generalizations, associations


def display_selection():
    table = CATALOG.split('| Class | Displayed attributes | Displayed operations |', 1)[1].split('\n\n', 1)[0]
    selection = {}
    for row in table.splitlines():
        fields = [v.strip() for v in row.strip('|').split('|')]
        if len(fields) != 3 or fields[0].startswith('-'):
            continue
        name = fields[0].removesuffix(' (abstract)')
        selection[name] = tuple([] if v == 'none' else [x.removesuffix(' (abstract)').strip() for x in v.split(',')] for v in fields[1:])
    return selection


def compact_projection(classes, selection):
    """Resolve explicit member names to unchanged canonical typed signatures."""
    assert set(selection) == set(classes), 'Display selection must cover all canonical classes'
    projected = {}
    for name, groups in selection.items():
        assert len(groups) == 2
        members = []
        for full, chosen, budget in zip(classes[name], groups, (3, 2)):
            assert len(chosen) <= budget and len(set(chosen)) == len(chosen), (name, 'display budget')
            by_name = {re.split(r'\s*[:(]', member[1:], maxsplit=1)[0].strip(): member for member in full}
            assert set(chosen) <= by_name.keys(), (name, 'unknown selected member', chosen)
            members.append([by_name[key] for key in chosen])
        projected[name] = tuple(members)
    assert ABSTRACT_METHOD[1] in projected[ABSTRACT_METHOD[0]][1]
    return projected


def check_lifelines(catalog=CATALOG, sequence=None):
    if sequence is None:
        sequence = (ROOT / 'docs/diagrams/02_Sequence_Diagram/PLANTUML_SEQUENCE.md').read_text(encoding='utf-8')
    names = set(re.findall(r'^(?:actor|participant) "([^"\n]+)"', sequence, re.M))
    assert names, 'No sequence lifelines found'
    for name in names:
        assert f'| {name} |' in catalog, ('Unmapped current lifeline', name)
    return names


def sources(classes, generalizations, associations):
    p = ['@startuml', 'skinparam classAttributeIconSize 0', 'skinparam shadowing false',
         'skinparam defaultFontName Arial', 'skinparam classBackgroundColor #e0f2fe',
         'skinparam linetype ortho', 'skinparam groupInheritance 2', 'hide circle']
    m = ['classDiagram', 'direction TB']
    for name, (attrs, ops) in classes.items():
        p += [('abstract class ' if name in ABSTRACT else 'class ') + name + ' {']
        p += ['  ' + a for a in attrs] + ['  --']
        p += ['  ' + ('{abstract} ' if (name, op) == ABSTRACT_METHOD else '') + op for op in ops]
        p += ['}']
        m += [f'class {name} {{']
        if name in ABSTRACT:
            m += ['  <<abstract>>']
        m += ['  ' + a for a in attrs]
        for op in ops:
            # The last colon separates the return type; parameter colons stay intact.
            method, result = op.rsplit(' : ', 1)
            m += ['  ' + method + ' ' + result + ('*' if (name, op) == ABSTRACT_METHOD else '')]
        m += ['}']
    for child, parent in generalizations:
        p += [f'{parent} <|-- {child}']
        m += [f'{parent} <|-- {child}']
    for a, ca, ra, b, cb, rb, kind in associations:
        arrow = '*--' if kind == 'composition' else '--'
        # Endpoint role and multiplicity are both preserved; Mermaid uses a combined label.
        p += [f'{a} "{ra} {ca}" {arrow} "{rb} {cb}" {b}']
        m += [f'{a} "{ca}" {arrow} "{cb}" {b} : {ra} / {rb}']
    p += ['@enduml']
    doc = ('# Class diagram sources\n\n'
           'Both blocks show a compact member selection of the preserved domain model in [CLASS_CATALOG.md](CLASS_CATALOG.md). '
           'Every declared operation has a contract in [method contracts](CLASS_CATALOG.md#method-contracts). '
           'Supporting value types/enums are defined in the catalog and intentionally not expanded as extra domain nodes. '
           'The native Draw.io tabs are the layout reference. Mermaid may not reproduce abstract-class italics, empty compartments, '
           'endpoint role placement or shared inheritance branches; these preview limits do not change semantics.\n\n'
           '```plantuml\n' + '\n'.join(p) + '\n```\n\n```mermaid\n' + '\n'.join(m) + '\n```\n')
    SCRATCH.mkdir(parents=True, exist_ok=True)
    (SCRATCH / 'sources.md').write_text(doc, encoding='utf-8')


def graph(classes, generalizations, associations):
    """Project the same model into eight locally routed views, using skill layout."""
    import copy
    import importlib.util
    skill = Path(os.environ.get('DRAWIO_SKILL_ROOT', Path.home() / '.codex/skills/drawio-skill'))
    if not (skill / 'scripts/autolayout.py').is_file():
        raise RuntimeError('Missing drawio-skill autolayout.py; set DRAWIO_SKILL_ROOT to an installed skill root')
    module = importlib.util.spec_from_file_location('drawio_autolayout', skill / 'scripts/autolayout.py')
    auto = importlib.util.module_from_spec(module)
    module.loader.exec_module(auto)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    views = [
        ('types', '01  Vehicle types', [0, 1], []),
        ('location', '02  Location and ownership', [], [0, 2, 3, 4, 26]),
        ('reservations', '03  Reservations', [2, 3], [5, 6, 7]),
        ('trips', '04  Trips and returns', [], [8, 9, 10, 11, 12]),
        ('charging', '05  Charging', [], [1, 13, 14, 15, 16, 28]),
        ('transfers', '06  Redistribution', [], [17, 18, 19, 27]),
        ('incidents', '07  Incident isolation', [], [20, 21, 22, 29, 30]),
        ('simulation', '08  What-if simulation', [], [23, 24, 25]),
    ]
    assert sorted(i for _, _, gs, _ in views for i in gs) == list(range(4))
    assert sorted(i for _, _, _, rs in views for i in rs) == list(range(31))
    sizes = {}
    for name, (attrs, ops) in classes.items():
        w = max(320, max(map(len, [name] + attrs + ops)) * 8.2 + 40)
        ah, oh = max(34, len(attrs) * 24 + 16), max(34, len(ops) * 26 + 16)
        sizes[name] = (w, 38 + ah + oh, ah, oh)

    def simplify(pts):
        out = []
        for p in pts:
            p = tuple(round(v, 2) for v in p)
            if not out or p != out[-1]:
                out.append(p)
            if len(out) >= 3:
                a, b, c = out[-3:]
                if (abs(a[0]-b[0]) < .1 and abs(b[0]-c[0]) < .1 or
                        abs(a[1]-b[1]) < .1 and abs(b[1]-c[1]) < .1):
                    out.pop(-2)
        return out

    mx = ET.Element('mxfile', host='app.diagrams.net', version='26.0.0')
    atlas = ET.SubElement(mx, 'diagram', id='domain', name='All views')
    atlas_model = ET.SubElement(atlas, 'mxGraphModel', grid='1', gridSize='10', page='0', background='#ffffff')
    atlas_root = ET.SubElement(atlas_model, 'root')
    ET.SubElement(atlas_root, 'mxCell', id='0')
    ET.SubElement(atlas_root, 'mxCell', id='1', parent='0')
    roots, frames, seen = [], [], set()

    def vertex(root, cid, text, x, y, w, h, style='', parent='1', **metadata):
        cell = ET.SubElement(root, 'mxCell', id=cid, value=text, vertex='1', parent=parent,
                             style='html=0;fontFamily=Arial;fontSize=14;fontColor=#0f172a;whiteSpace=wrap;' + style,
                             **metadata)
        ET.SubElement(cell, 'mxGeometry', x=str(x), y=str(y), width=str(w), height=str(h), **{'as': 'geometry'})
        return cell

    for vid, title, gens, rels in views:
        names = set()
        for j in gens:
            names.update(generalizations[j])
        for j in rels:
            names.update((associations[j][0], associations[j][3]))
        names = [n for n in classes if n in names]
        nodes = [{'id': n, 'width': sizes[n][0], 'height': sizes[n][1]} for n in names]
        edges = []
        focus = {'trips': 'Trip', 'transfers': 'TransferOrder', 'incidents': 'OperationalIncident'}.get(vid)
        orientation = {}
        for j in rels:
            a, _, _, b, _, _, _ = associations[j]
            start, end = (b, a) if b == focus else (a, b)
            orientation[j] = (start, end)
            # Reserve physical space for each label; also distinguishes parallel links.
            nodes.append({'id': f'label_{j}', 'width': 250, 'height': 64})
            edges += [{'source': start, 'target': f'label_{j}'}, {'source': f'label_{j}', 'target': end}]
        for parent in sorted({generalizations[j][1] for j in gens}):
            nodes.append({'id': 'join_'+parent, 'width': 2, 'height': 2})
            edges.append({'source': parent, 'target': 'join_'+parent})
            edges += [{'source': 'join_'+parent, 'target': generalizations[j][0]} for j in gens if generalizations[j][1] == parent]
        data = {'direction': 'LR' if vid == 'simulation' else 'TB', 'ranksep': 1.1, 'nodesep': 1.0, 'nodes': nodes, 'edges': edges}
        dot = auto.build_dot(data).replace('splines=ortho;', 'splines=ortho; edge [arrowhead=none];')
        height, raw_pos, raw_edges = auto.layout(dot)
        positions = {n: (x*72+80, (height-y)*72+150) for n, (x, y) in raw_pos.items()}
        routes = {(a, b): [(x*72+80, (height-y)*72+150) for x, y in pts] for (a, b), pts in raw_edges.items()}
        page = ET.SubElement(mx, 'diagram', id=vid, name=title)
        model = ET.SubElement(page, 'mxGraphModel', grid='1', gridSize='10', page='0', background='#ffffff')
        root = ET.SubElement(model, 'root')
        ET.SubElement(root, 'mxCell', id='0')
        ET.SubElement(root, 'mxCell', id='1', parent='0')
        rects = {}
        for name in names:
            cx, cy = positions[name]
            w, h, ah, oh = sizes[name]
            x, y = round(cx-w/2, 2), round(cy-h/2, 2)
            rects[name] = (x, y, w, h)
            vertex(root, name, '', x, y, w, h, 'container=1;collapsible=0;fillColor=#ffffff;strokeColor=#0284c7;', **{'data-class': name})
            vertex(root, name+'_title', name, 0, 0, w, 38,
                   f'fillColor=#e0f2fe;strokeColor=#0284c7;fontSize=16;fontStyle={3 if name in ABSTRACT else 1};', name)
            vertex(root, name+'_attrs', '\n'.join(classes[name][0]), 0, 38, w, ah,
                   'fillColor=#ffffff;strokeColor=#0284c7;align=left;verticalAlign=top;spacingLeft=12;spacingTop=7;', name)
            vertex(root, name+'_ops', '', 0, 38+ah, w, oh, 'fillColor=#ffffff;strokeColor=#0284c7;', name)
            for i, op in enumerate(classes[name][1]):
                vertex(root, name+f'_op{i}', op, 0, 6+i*26, w, 26,
                       f'fillColor=none;strokeColor=none;align=left;spacingLeft=12;fontStyle={2 if (name, op)==ABSTRACT_METHOD else 0};', name+'_ops')

        def add_edge(cid, a, b, pts, kind):
            pts = simplify(pts)
            ax, ay, aw, ah = rects[a]
            bx, by, bw, bh = rects[b]
            # Dot's plain output rounds coordinates; put terminals exactly on the box border.
            for index, (x, y, w, h) in [(0, rects[a]), (-1, rects[b])]:
                px, py = pts[index]
                side = min([(abs(px-x), (x, py)), (abs(px-x-w), (x+w, py)),
                            (abs(py-y), (px, y)), (abs(py-y-h), (px, y+h))], key=lambda item:item[0])
                pts[index] = side[1]
            sx, sy = pts[0]
            tx, ty = pts[-1]
            style = ('edgeStyle=none;noEdgeStyle=1;rounded=0;html=0;strokeColor=#334155;strokeWidth=1.6;'
                     f'exitX={(sx-ax)/aw};exitY={(sy-ay)/ah};entryX={(tx-bx)/bw};entryY={(ty-by)/bh};'
                     'exitPerimeter=0;entryPerimeter=0;endArrow=none;')
            if kind == 'generalization':
                style += 'endArrow=block;endFill=0;endSize=15;'
            elif kind == 'composition':
                style += 'startArrow=diamond;startFill=1;startSize=13;'
            cell = ET.SubElement(root, 'mxCell', id=cid, value='', edge='1', parent='1', source=a, target=b, style=style)
            geo = ET.SubElement(cell, 'mxGeometry', relative='1', **{'as': 'geometry'})
            arr = ET.SubElement(geo, 'Array', **{'as': 'points'})
            for xx, yy in pts[1:-1]:
                ET.SubElement(arr, 'mxPoint', x=str(xx), y=str(yy))
            return pts

        def label(cid, suffix, text, x, y, w=0, h=0):
            cell = vertex(root, cid+'_'+suffix, text, x, y, w, h,
                          'edgeLabel;resizable=0;points=[];align=center;verticalAlign=middle;'
                          'labelBackgroundColor=#ffffff;fontSize=13;', cid)
            cell.find('mxGeometry').set('relative', '0')

        for j in gens:
            child, parent = generalizations[j]
            join = 'join_'+parent
            # Include the hidden junction center to keep the shared stem connected.
            pts = routes[(parent, join)] + [positions[join]] + routes[(join, child)]
            add_edge(f'g{j}', child, parent, list(reversed(pts)), 'generalization')
        for j in rels:
            a, ca, ra, b, cb, rb, kind = associations[j]
            start, end = orientation[j]
            ghost = f'label_{j}'
            before, after = routes[(start, ghost)], routes[(ghost, end)]
            cx, cy = positions[ghost]
            elbows = [(cx, before[-1][1]), (cx, after[0][1])] if data['direction'] == 'LR' else [(before[-1][0], cy), (after[0][0], cy)]
            pts = before + elbows + after
            if start != a:
                pts.reverse()
            pts = add_edge(f'r{j}', a, b, pts, kind)
            lx, ly = positions[ghost]
            label(f'r{j}', 'label', f'{ra} / {rb}', lx-125, ly-20, 250, 40)
            # Labels stay just outside each class; an orthogonal first/last segment defines its side.
            for suffix, text, p, q in [('tail', ca, pts[0], pts[1]), ('head', cb, pts[-1], pts[-2])]:
                dx, dy = q[0]-p[0], q[1]-p[1]
                if abs(dx) > abs(dy):
                    px, py = p[0]+(24 if dx>0 else -24), p[1]-14
                else:
                    px, py = p[0]+20, p[1]+(22 if dy>0 else -22)
                label(f'r{j}', suffix, text, px, py)
        w = max(x+nw for x, y, nw, nh in rects.values()) + 80
        h = max(y+nh for x, y, nw, nh in rects.values()) + 80
        model.set('pageWidth', str(w))
        model.set('pageHeight', str(h))
        vertex(root, 'title', title, 40, 20, w-80, 42, 'strokeColor=none;fillColor=none;fontSize=24;fontStyle=1;align=left;')
        vertex(root, 'subtitle', 'Same class name = same domain class across views. Compact members repeat consistently; full members and contracts are in the catalog.', 40, 68, w-80, 36, 'strokeColor=none;fillColor=none;align=left;fontSize=14;')
        roots.append((vid, title, root, w, h))

    # A single all-views SVG, plus native tabs with the same full-size detail views.
    column_width = max(w for _, _, _, w, _ in roots)
    y = 130
    for row in range(0, len(roots), 2):
        pair = roots[row:row+2]
        for col, (vid, title, root, w, h) in enumerate(pair):
            ox, oy = 50+col*(column_width+70), y
            vertex(atlas_root, 'frame_'+vid, '', ox, oy, column_width, h,
                   'container=1;collapsible=0;fillColor=#ffffff;strokeColor=#cbd5e1;strokeWidth=1;pointerEvents=0;')
            ids = {c.attrib['id']: c.attrib['id'] if c.attrib['id'] not in seen else vid+'__'+c.attrib['id'] for c in root.findall('mxCell') if c.attrib['id'] not in ('0', '1')}
            for cell in root.findall('mxCell'):
                old_id = cell.attrib['id']
                if old_id in ('0', '1'):
                    continue
                new = copy.deepcopy(cell)
                new.set('id', ids[old_id])
                new.set('data-view', vid)
                for key in ('parent', 'source', 'target'):
                    if new.get(key) not in (None, '1'):
                        new.set(key, ids[new.get(key)])
                if new.get('parent') == '1':
                    new.set('parent', 'frame_'+vid)
                atlas_root.append(new)
            seen.update(ids.values())
            frames.append({'id': vid, 'x': ox, 'y': oy, 'w': w, 'h': h})
        y += max(h for _, _, _, _, h in pair)+70
    vertex(atlas_root, 'atlas_title', 'Smart E-Mobility Hub | domain class model', 50, 20, column_width*2, 44,
           'fillColor=none;strokeColor=none;align=left;fontSize=28;fontStyle=1;')
    vertex(atlas_root, 'atlas_subtitle', '19 classes | 35 relationships | 8 focused views. Use the numbered tabs in the .drawio file for details.', 50, 73, column_width*2, 35,
           'fillColor=none;strokeColor=none;align=left;fontSize=18;')
    atlas_model.set('pageWidth', str(column_width*2+220))
    atlas_model.set('pageHeight', str(y))
    ET.indent(mx)
    ET.ElementTree(mx).write(OUTPUT / 'drawio/smart_emobility_class_diagram.drawio', encoding='utf-8', xml_declaration=True)
    ET.ElementTree(mx).write(SCRATCH / 'model.drawio', encoding='utf-8', xml_declaration=True)
    (SCRATCH / 'frames.json').write_text(json.dumps(frames), encoding='utf-8')
    print('Built eight auto-laid-out views; all 35 relationships preserved exactly once in the overview')


def self_check(classes, generalizations, associations):
    assert len(classes) == 19 and len(generalizations) == 4 and len(associations) == 31
    assert ABSTRACT <= classes.keys()
    assert {c for c, _ in generalizations} == {'ElectricBicycle', 'ElectricMotorcycle', 'VehicleReservation', 'ParkingReservation'}
    methods = CATALOG.split('## Method contracts\n', 1)[1]
    declared = set()
    for name, (_, ops) in classes.items():
        for op in ops:
            key = name + '.' + op[1:].split('(')[0]
            assert f'## {key}\n' in methods, key
            contract = methods.split(f'## {key}\n', 1)[1].split('\n## ', 1)[0]
            assert f'**Signature:** `{op}`' in contract,(key,'signature drift')
            for field in ('Signature', 'Purpose', 'Inputs', 'Output', 'Preconditions', 'Algorithm', 'Postconditions', 'Errors'):
                assert f'**{field}:**' in contract, (key, field)
            declared.add(key)
    assert len(declared) == 18
    for a, ca, ra, b, cb, rb, kind in associations:
        assert a in classes and b in classes and ra and rb
        assert ca in {'1', '0..1', '0..*', '1..*'} and cb in {'1', '0..1', '0..*', '1..*'}
    required_booking=['VehicleReservation','1','booking','Trip','0..1','resultingTrip','association']
    assert required_booking in associations,'Trip must retain its required booking'
    assert ['ElectricVehicle','1','parkedVehicle','ParkingReservation','0..*','parkingReservations','association'] in associations,'Missing booked parking vehicle'
    assert ['ParkingSlot','0..*','heldDestinationSlots','TransferOrder','0..1','holdingTransfer','association'] in associations,'Missing transfer slot holds'
    assert '-targetBatteryPercent : Integer' in classes['ChargingRequest'][0],'Missing charging target'
    assert ['ChargingRequest','0..1','allocationOwner','ChargingPoint','0..1','allocatedPoint','association'] in associations,'Missing pre-session allocation owner'
    assert ['Trip','0..1','reportedTrip','OperationalIncident','0..*','incidents','association'] in associations,'Missing optional historical incident Trip'
    assert ['UserAccount','0..1','reporter','OperationalIncident','0..*','reportedIncidents','association'] in associations,'Missing optional incident reporter'
    assert '-description : String' in classes['OperationalIncident'][0],'Missing report description'
    assert '-reportedLocation : OptionalGeoLocation' in classes['OperationalIncident'][0],'Missing report-time location'
    assert '-pickupClaimed : Boolean = false' in classes['VehicleReservation'][0]
    assert '-allocatedPowerKW : Real = 0' in classes['ChargingPoint'][0]
    assert '+stop(at : DateTime, reason : ChargingStopReason) : void' in classes['ChargingSession'][1]
    lifelines = check_lifelines()
    for uc in range(1, 15):
        assert f'| UC{uc:02} |' in CATALOG
    for scenario in ('MetroSurge', 'FullParking', 'ChargingDemandSurge', 'PartialChargerFailure', 'VehicleClustering'):
        assert f'| {scenario} |' in CATALOG
    print(f'Checked {len(classes)} classes, {len(declared)} methods, 4 generalizations, 31 associations, {len(lifelines)} current lifelines and UC01–UC14')


def check_native(embedded, classes, generalizations, associations):
    """Validate every editable occurrence and relationship, including numbered pages."""
    pages = embedded.findall('diagram')
    assert len(pages) == 9
    for page in pages:
        cells = {c.get('id'): c for c in page.iter('mxCell')}
        assert len(cells) == len(list(page.iter('mxCell'))), 'Duplicate cell IDs'
        for cell in cells.values():
            for key in ('parent', 'source', 'target'):
                assert cell.get(key) is None or cell.get(key) in cells, (page.get('id'), cell.get('id'), key)
            name = cell.get('data-class')
            if name:
                cid = cell.get('id')
                attrs, ops = classes[name]
                assert cells[cid+'_attrs'].get('value').splitlines() == attrs, (page.get('id'), name, 'attributes')
                actual = [c.get('value') for c in cells.values() if c.get('parent') == cid+'_ops']
                assert actual == ops, (page.get('id'), name, 'operations')
                assert all(cid+suffix in cells for suffix in ('_title', '_attrs', '_ops'))
                for i, op in enumerate(ops):
                    assert ('fontStyle=2;' in cells[cid+f'_op{i}'].get('style')) == ((name,op) == ABSTRACT_METHOD)
            if cell.get('edge') != '1':
                continue
            cid = cell.get('id')
            identity = cid.split('__')[-1]
            source, target = cells[cell.get('source')].get('data-class'), cells[cell.get('target')].get('data-class')
            if identity.startswith('g'):
                assert (source,target) == tuple(generalizations[int(identity[1:])])
                assert 'endArrow=block;endFill=0;' in cell.get('style')
            else:
                a,ca,ra,b,cb,rb,kind = associations[int(identity[1:])]
                assert (source,target) == (a,b)
                for suffix,value in (('_tail',ca),('_head',cb),('_label',f'{ra} / {rb}')):
                    assert cells[cid+suffix].get('value') == value, (page.get('id'),cid,suffix)
                    assert 'edgeLabel;' in cells[cid+suffix].get('style')
                assert ('startArrow=diamond;startFill=1;' in cell.get('style')) == (kind == 'composition')


def check_sources(classes, generalizations, associations, export=False):
    doc = (SCRATCH / 'sources.md').read_text(encoding='utf-8')
    p = re.search(r'```plantuml\n(.*?)\n```', doc, re.S)[1]
    m = re.search(r'```mermaid\n(.*?)\n```', doc, re.S)[1]
    assert p.startswith('@startuml') and p.endswith('@enduml') and m.startswith('classDiagram')
    pclasses = re.findall(r'^(abstract class|class) (\w+) \{\n(.*?)^\}', p, re.M | re.S)
    mclasses = re.findall(r'^class (\w+) \{\n(.*?)^\}', m, re.M | re.S)
    assert {n for _, n, _ in pclasses} == set(classes) == {n for n, _ in mclasses}
    for kind, name, body in pclasses:
        assert (kind == 'abstract class') == (name in ABSTRACT)
        members = [s.strip().removeprefix('{abstract} ') for s in body.splitlines() if s.strip() != '--']
        assert members == classes[name][0] + classes[name][1], name
        assert ('{abstract}' in body) == (name == 'Reservation')
    for name, body in mclasses:
        assert ('<<abstract>>' in body) == (name in ABSTRACT)
        members = []
        for member in body.splitlines():
            member = member.strip()
            if member == '<<abstract>>':
                continue
            if '(' in member:
                left, right = member.rsplit(' ', 1)
                member = left + ' : ' + right.removesuffix('*')
                assert right.endswith('*') == ((name, member) == ABSTRACT_METHOD)
            members.append(member)
        assert members == classes[name][0] + classes[name][1], name
    assert set(re.findall(r'^(\w+) <\|-- (\w+)$', p, re.M)) == {(par, c) for c, par in generalizations}
    assert set(re.findall(r'^(\w+) <\|-- (\w+)$', m, re.M)) == {(par, c) for c, par in generalizations}
    for a, ca, ra, b, cb, rb, kind in associations:
        arrow = '*--' if kind == 'composition' else '--'
        assert f'{a} "{ra} {ca}" {arrow} "{rb} {cb}" {b}' in p
        assert f'{a} "{ca}" {arrow} "{cb}" {b} : {ra} / {rb}' in m
    if export:
        report_file=ROOT / '.agent/verification/class-diagram.json' if OUTPUT==DEFAULT_OUTPUT else SCRATCH / 'class-verification.json'
        report=json.loads(report_file.read_text())
        assert report['status']=='passed'
        for name,digest in report['fingerprints'].items():
            assert hashlib.sha256((BASE/name).read_bytes()).hexdigest()==digest,('stale source',name)
        for name,digest in report['artifacts'].items():
            assert hashlib.sha256((OUTPUT/name).read_bytes()).hexdigest()==digest,('stale artifact',name)
        assert len(list((OUTPUT/'png').glob('*.png')))==9
        embedded = ET.parse(OUTPUT / 'drawio/smart_emobility_class_diagram.drawio').getroot()
        check_native(embedded, classes, generalizations, associations)
        cells = {c.attrib['id']: c for c in embedded.find('diagram').iter('mxCell')}
        occurrences = [c for c in cells.values() if 'data-class' in c.attrib]
        assert len(occurrences) == 38 and {c.get('data-class') for c in occurrences} == set(classes)
        visible = ' '.join(c.get('value','') for c in cells.values())
        visible = ' '.join(visible.split())
        for occurrence in occurrences:
            name, cid = occurrence.get('data-class'), occurrence.get('id')
            attrs, ops = classes[name]
            assert cells[cid+'_title'].attrib['value'] == name
            assert cells[cid+'_attrs'].attrib['value'].splitlines() == attrs
            assert 'fontStyle=3;' in cells[cid+'_title'].attrib['style'] if name in ABSTRACT else 'fontStyle=1;' in cells[cid+'_title'].attrib['style']
            for i, op in enumerate(ops):
                assert cells[cid+f'_op{i}'].attrib['value'] == op
            for text in [name] + attrs + ops:
                assert ' '.join(text.split()) in visible, text
        for j, (child, parent) in enumerate(generalizations):
            cell = cells[f'g{j}']
            assert (cells[cell.get('source')].get('data-class'), cells[cell.get('target')].get('data-class')) == (child, parent)
            assert 'endArrow=block;endFill=0;' in cell.attrib['style']
        for i, (a, ca, ra, b, cb, rb, kind) in enumerate(associations):
            assert cells[cells[f'r{i}'].get('source')].get('data-class') == a
            assert cells[cells[f'r{i}'].get('target')].get('data-class') == b
            assert cells[f'r{i}_label'].attrib['value'] == f'{ra} / {rb}'
            assert cells[f'r{i}_tail'].attrib['value'] == ca and cells[f'r{i}_head'].attrib['value'] == cb
            assert ('startArrow=diamond;startFill=1;' in cells[f'r{i}'].attrib['style']) == (kind == 'composition')
        assert len([c for c in cells.values() if c.attrib.get('edge') == '1']) == 35
        assert 'fontStyle=2;' in cells['Reservation_op1'].attrib['style']
        pages = embedded.findall('diagram')
        assert len(pages) == 9
        detail_edges = [c.get('id') for p in pages[1:] for c in p.iter('mxCell') if c.get('edge') == '1']
        assert sorted(detail_edges) == sorted([f'g{i}' for i in range(4)] + [f'r{i}' for i in range(31)])
        assert ET.tostring(ET.parse(OUTPUT / 'drawio/smart_emobility_class_diagram.drawio').getroot()) == ET.tostring(embedded)
    print('PASS: catalog/PlantUML/Mermaid' + ('/editable mxGraph' if export else '') + ' name, member and relationship parity')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    OUTPUT = args.output_dir.resolve()
    SCRATCH = ROOT / '.agent/scratch/class_model' if OUTPUT == DEFAULT_OUTPUT else OUTPUT / '.scratch'
    for directory in ('drawio', 'png'):
        (OUTPUT / directory).mkdir(parents=True, exist_ok=True)
    model = read_model()
    self_check(*model)
    model = (compact_projection(model[0], display_selection()), *model[1:])
    if args.check:
        check_sources(*model, export=True)
    else:
        sources(*model)
        check_sources(*model)
        graph(*model)
