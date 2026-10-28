import os
import html
import textwrap
import argparse
import re
import math
import json
from pathlib import Path

def escape_xml(s):
    return html.escape(str(s), quote=True)

def typed_name(participant):
    if participant.get('type') == 'actor':
        return participant['name']
    name = participant['name'].replace(' ', '')
    return ('<<datastore>> ' if participant.get('type') == 'datastore' else ':') + name


def message_label(index, message):
    return ('1' if index == 0 else f'1.{index}') + ': ' + message['text']


PALETTE = {'#dbeafe':'#93c5fd', '#e0f2fe':'#93c5fd', '#dcfce7':'#86efac',
           '#ffe4e6':'#fda4af', '#f3e8ff':'#d8b4fe', '#fef3c7':'#fcd34d'}
MESSAGE_SIZE, HEADER_SIZE, TITLE_SIZE, ANNOTATION_SIZE = 16, 18, 22, 14


def line_height(size):
    return math.ceil(size * 1.5)


def text_width(lines, size):
    return math.ceil(max(map(len, lines)) * size * .65)


def header_lines(p):
    return textwrap.wrap(typed_name(p), width=24, break_long_words=False)


def header_width(p):
    return max(200, text_width(header_lines(p), HEADER_SIZE) + 24)


def header_height(p):
    return max(72, len(header_lines(p)) * line_height(HEADER_SIZE) + 24)


def layout(participants, messages, title=''):
    labels = [textwrap.wrap(message_label(i, m), width=31, break_long_words=False,
                            break_on_hyphens=False) for i, m in enumerate(messages)]
    gaps = [(header_width(a)+header_width(b))/2+32 for a,b in zip(participants, participants[1:])]
    for m, lines in zip(messages, labels):
        column = m['src'] if m.get('is_self') else min(m['src'], m['dst'])
        required = text_width(lines, MESSAGE_SIZE) + (82 if m.get('is_self') else 44)
        if column < len(gaps): gaps[column] = max(gaps[column], required)
    centers = [max(280, 24+header_width(participants[0])/2)]
    for gap in gaps: centers.append(centers[-1] + gap)
    rows, y = [], max(190, max(96+header_height(p) for p in participants)) + 24
    for m, lines in zip(messages, labels):
        y += len(lines) * line_height(MESSAGE_SIZE) + 22
        rows.append(y)
        y += max(52, len(lines)*line_height(MESSAGE_SIZE)+12) if m.get('is_self') else 12
    right = centers[-1] + header_width(participants[-1])/2
    for m, lines in zip(messages, labels):
        if m.get('is_self'):
            right = max(right, centers[m['src']] + 60 + text_width(lines, MESSAGE_SIZE))
    width = max(right+32, text_width([title],TITLE_SIZE)+72,
                text_width(['Timing: existing scenario assumption; not a measured performance guarantee.'],ANNOTATION_SIZE)+56)
    return centers, rows, labels, width, y + 100


def create_slide_sequence_diagram(filepath, title, participants, messages,
                                  active_ranges, duration_constraint=None):
    centers, rows, labels, width, height = layout(participants, messages, title)
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg = []

    def vertex(id, x, y, w, h, value='', fill='none', stroke='none', style=''):
        fill = PALETTE.get(fill, fill)
        stroke = '#000000' if stroke != 'none' else 'none'
        cells.append(f'<mxCell id="{id}" value="{escape_xml(value).replace(chr(10), "&#xa;")}" '
                     f'style="html=0;fontFamily=Segoe UI;fontSize=16;fillColor={fill};'
                     f'strokeColor={stroke};whiteSpace=wrap;{style}" vertex="1" parent="1">'
                     f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        svg.append(f'<rect id="{id}" x="{x}" y="{y}" width="{w}" height="{h}" '
                   f'fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')

    def text(id, x, y, w, lines, bold=False, size=MESSAGE_SIZE, italic=False, center=False):
        color = '#000000'
        # Explicit text vertices avoid draw.io edge-label placement defaults.
        h = len(lines) * line_height(size)
        vertex(id, x, y, w, h, '\n'.join(lines), style=f'text;align={"center" if center else "left"};verticalAlign=top;'
               f'spacing=0;fontColor={color};fontSize={size};fontStyle={int(bold)+2*int(italic)};')
        tx = x+w/2 if center else x
        svg.append(f'<text text-anchor="{"middle" if center else "start"}" id="text_{id}" x="{tx}" y="{y+size+1}" font-family="Segoe UI" '
                   f'font-size="{size}" fill="{color}" font-weight="{600 if bold else 400}" font-style="{"italic" if italic else "normal"}">')
        for i, line in enumerate(lines):
            svg.append(f'<tspan x="{tx}" dy="{0 if i == 0 else line_height(size)}">{escape_xml(line)}</tspan>')
        svg.append('</text>')

    def edge(id, points, response=False, kind='message', arrow=True, color=None):
        color = color or ('#2563eb' if response else '#1e293b')
        dash = '1' if response or kind == 'lifeline' else '0'
        head = ('open' if response else 'block') if arrow else 'none'
        timing = 'startArrow=open;endArrow=open;' if kind == 'timing' else ''
        cells.append(f'<mxCell id="{id}" value="" edge="1" parent="1" '
                     f'style="html=0;noEdgeStyle=1;rounded=0;strokeColor={color};strokeWidth=1.5;'
                     f'endArrow={head};endFill={0 if response else 1};dashed={dash};{timing}">'
                     '<mxGeometry relative="1" as="geometry">'
                     f'<mxPoint x="{points[0][0]}" y="{points[0][1]}" as="sourcePoint"/>'
                     f'<mxPoint x="{points[-1][0]}" y="{points[-1][1]}" as="targetPoint"/>'
                     + ('<Array as="points">' + ''.join(f'<mxPoint x="{x}" y="{y}"/>' for x,y in points[1:-1]) + '</Array>' if len(points)>2 else '')
                     + '</mxGeometry></mxCell>')
        dashed = ' stroke-dasharray="5 4"' if dash == '1' else ''
        if len(points) == 2:
            (x1,y1),(x2,y2) = points
            svg.append(f'<line id="{id}" data-kind="{kind}" x1="{x1}" y1="{y1}" '
                       f'x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.5"{dashed}/>')
        else:
            path = 'M ' + ' L '.join(f'{x} {y}' for x,y in points)
            svg.append(f'<path id="{id}" data-kind="self" d="{path}" fill="none" '
                       f'stroke="{color}" stroke-width="1.5"/>')
        if kind == 'timing':
            (x,a),(_,b)=points
            svg.append(f'<path d="M {x-4} {a+8} L {x} {a} L {x+4} {a+8} M {x-4} {b-8} L {x} {b} L {x+4} {b-8}" fill="none" stroke="{color}"/>')
        if arrow:
            x,y = points[-1]; prev = points[-2]; sign = 1 if x>prev[0] else -1
            shape = f'{x-sign*8},{y-4} {x},{y} {x-sign*8},{y+4}'
            svg.append(f'<polyline points="{shape}" fill="{"none" if response else color}" '
                       f'stroke="{color}" stroke-width="1.5"/>')

    vertex('title_box', 25, 25, width-50, 48, fill='#e0f2fe', stroke='#0284c7')
    text('title', 36, 31, width-72, [title], True, size=TITLE_SIZE)
    for i,p in enumerate(participants):
        p = dict(p, fill=PALETTE[p['fill']], stroke='#000000', text_c='#000000')
        cx=centers[i]
        if p.get('type') == 'actor':
            cells.append(f'<mxCell id="p_{i}" value="" style="shape=umlActor;fillColor={p["fill"]};'
                         f'strokeColor={p["stroke"]};" vertex="1" parent="1">'
                         f'<mxGeometry x="{cx-15}" y="92" width="30" height="55" as="geometry"/></mxCell>')
            svg.append(f'<g id="p_{i}" fill="{p["fill"]}" stroke="{p["stroke"]}" stroke-width="1.5">'
                       f'<circle cx="{cx}" cy="101" r="9"/><path d="M {cx} 110 L {cx} 127 '
                       f'M {cx-15} 118 L {cx+15} 118 M {cx-15} 147 L {cx} 127 L {cx+15} 147" fill="none"/></g>')
            text(f'header_{i}', cx-header_width(p)/2, 156, header_width(p), [typed_name(p)], True, size=HEADER_SIZE, center=True)
            top=190
        else:
            lines=header_lines(p)
            vertex(f'p_{i}',cx-header_width(p)/2,96,header_width(p),header_height(p),fill=p['fill'],stroke=p['stroke'])
            text(f'header_{i}',cx-header_width(p)/2+12,108,header_width(p)-24,lines,True,size=HEADER_SIZE)
            top=96+header_height(p)
        edge(f'line_{i}',[(cx,top),(cx,height-48)],kind='lifeline',arrow=False,color='#94a3b8')
    for p,ranges in active_ranges.items():
        for j,(start,end) in enumerate(ranges):
            vertex(f'act_{p}_{j}',centers[p]-6,rows[start],12,rows[end]-rows[start],
                   fill=participants[p]['fill'],stroke=participants[p]['stroke'])
    for i,(m,lines,y) in enumerate(zip(messages,labels,rows)):
        a,b=centers[m['src']],centers[m['dst']]
        if m.get('is_self'):
            vertex(f'nested_{i}',a, y+24, 12, 16, fill=participants[m['src']]['fill'],stroke=participants[m['src']]['stroke'])
            points=[(a+6,y),(a+42,y),(a+42,y+24),(a+12,y+24)]
            lx=a+54; ly=y-4; lw=text_width(lines, MESSAGE_SIZE)
        else:
            direction=1 if b>a else -1
            points=[(a+direction*6,y),(b-direction*6,y)]
            left=min(m['src'],m['dst'])
            lx=centers[left]+22; ly=y-len(lines)*line_height(MESSAGE_SIZE)-8
            lw=centers[left+1]-centers[left]-44
        edge(f'msg_{i}',points,m.get('is_resp',False))
        text(f'label_{i}',lx,ly,lw,lines,italic=m.get('is_resp',False))
        if m.get('time_mark'):
            text(f'time_{i}',centers[0]-48,y-10,36,[m['time_mark']],True,size=ANNOTATION_SIZE)
    if duration_constraint:
        a=rows[duration_constraint['start_msg_idx']]; b=rows[duration_constraint['end_msg_idx']]
        edge('duration_line',[(210,a),(210,b)],True,kind='timing',arrow=False,color='#dc2626')
        text('duration',28,(a+b)//2,174,[duration_constraint['label']],True,size=ANNOTATION_SIZE)
        text('assumption',28,height-32-line_height(ANNOTATION_SIZE),width-56,['Timing: existing scenario assumption; not a measured performance guarantee.'],size=ANNOTATION_SIZE)
    xml=('<mxfile host="drawio"><diagram id="diagram_1" name="Page-1">'
         f'<mxGraphModel background="#ffffff" page="1" pageWidth="{width}" pageHeight="{height}"><root>'
         + ''.join(cells) + '</root></mxGraphModel></diagram></mxfile>')
    output=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" content="{escape_xml(xml)}">'
            f'<rect width="{width}" height="{height}" fill="white"/>' + ''.join(svg) + '</svg>')
    os.makedirs(os.path.dirname(filepath),exist_ok=True)
    with open(filepath,'w',encoding='utf-8') as f:
        f.write(output)
    print(f'Created: {filepath}')


def catalog_block(d, mermaid=False):
    if mermaid:
        config = {'theme':'base', 'fontFamily':'Segoe UI',
                  'themeVariables':{'fontSize':f'{MESSAGE_SIZE}px', 'textColor':'#000000',
                    'primaryTextColor':'#000000', 'actorTextColor':'#000000',
                    'signalTextColor':'#000000', 'noteTextColor':'#000000',
                    'labelTextColor':'#000000', 'loopTextColor':'#000000',
                    'actorBkg':PALETTE['#dbeafe'], 'actorBorder':'#000000',
                    'activationBkgColor':PALETTE['#dcfce7'], 'activationBorderColor':'#000000',
                    'noteBkgColor':PALETTE['#fef3c7'], 'noteBorderColor':'#000000',
                    'labelBoxBorderColor':'#000000', 'labelBoxBkgColor':PALETTE['#dbeafe'],
                    'background':'#ffffff'},
                  'sequence':{'actorFontSize':HEADER_SIZE, 'messageFontSize':MESSAGE_SIZE,
                              'noteFontSize':ANNOTATION_SIZE, 'mirrorActors':False}}
        lines = ['%%{init: ' + json.dumps(config, separators=(',',':')) + '}%%', 'sequenceDiagram']
    else:
        lines = ['@startuml', 'hide footbox', 'skinparam backgroundColor #ffffff',
                 'skinparam defaultFontName Segoe UI', 'skinparam defaultFontColor #000000',
                 f'skinparam defaultFontSize {MESSAGE_SIZE}',
                 'skinparam sequence {', '  ParticipantBorderColor #000000',
                 '  ParticipantFontColor #000000', f'  ParticipantFontSize {HEADER_SIZE}',
                 '  ActorBorderColor #000000', '  ActorFontColor #000000',
                 f'  ActorFontSize {HEADER_SIZE}', '  LifeLineBorderColor #000000',
                 '}', 'skinparam ArrowFontColor #000000',
                 f'skinparam ArrowFontSize {MESSAGE_SIZE}',
                 'skinparam noteFontColor #000000', f'skinparam noteFontSize {ANNOTATION_SIZE}',
                 'skinparam noteBorderColor #000000', 'skinparam noteBackgroundColor '+PALETTE['#fef3c7'],
                 'skinparam titleFontColor #000000', f'skinparam titleFontSize {TITLE_SIZE}']
    def activate(p):
        return f'activate P{p}' + ('' if mermaid else ' '+PALETTE[d['participants'][p]['fill']])
    for i,p in enumerate(d['participants']):
        kind = 'actor' if p.get('type') == 'actor' else 'participant'
        name = typed_name(p)
        lines.append(f'    {kind} P{i} as {name}' if mermaid else f'{kind} "{name}" as P{i} {PALETTE[p["fill"]]}')
    for i,m in enumerate(d['messages']):
        starts=[p for p,ranges in d['active_ranges'].items() for start,end in ranges if start==i]
        # A receiver starts execution at message arrival; a sender at dispatch.
        before=[p for p in starts if p != m['dst']]
        after=[p for p in starts if p == m['dst']]
        lines.extend(activate(p) for p in before)
        arrow = ('-->>' if m.get('is_resp') else '->>') if mermaid else ('-->' if m.get('is_resp') else '->')
        lines.append(f'P{m["src"]}{arrow}P{m["dst"]}: {message_label(i,m)}')
        lines.extend(activate(p) for p in after)
        if m.get('is_self'):
            lines.extend([activate(m['src']),f'deactivate P{m["src"]}'])
        if m.get('time_mark'):
            lines.append(f'{"Note" if mermaid else "note"} left of P0: {m["time_mark"]}')
        lines.extend(f'deactivate P{p}' for p,ranges in d['active_ranges'].items() for start,end in ranges if end==i)
    lines.append(f'{"Note" if mermaid else "note"} left of P0: {d["duration_constraint"]["label"]} (scenario assumption)')
    if not mermaid:
        lines.append('@enduml')
    return '\n'.join(('    '+line if mermaid and i else line) for i,line in enumerate(lines))


def write_catalog(directory):
    source = Path(__file__).resolve().parents[2] / '01_Diagram/02_Sequence_Diagram/PLANTUML_SEQUENCE.md'
    content = source.read_text(encoding='utf-8').replace('tô màu pastel phân biệt', 'tô màu đậm hơn phân biệt')
    for language in ('plantuml','mermaid'):
        blocks=iter(catalog_block(d,language=='mermaid') for d in DIAGRAMS)
        content,count=re.subn(r'```'+language+r'\n.*?```',lambda _: '```'+language+'\n'+next(blocks)+'\n```',content,flags=re.S)
        assert count == 7, f'Expected seven {language} blocks, found {count}'
    (directory/'PLANTUML_SEQUENCE.md').write_text(content,encoding='utf-8')

# ==============================================================================
# CONFIGURATION FOR ALL 7 SEQUENCE DIAGRAMS
# ==============================================================================

DIAGRAMS = [
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ01-Reserve_Vehicle.drawio.svg",
        "title": "Sequence Diagram: SQ01 - Reserve Vehicle (UC03)",
        "participants": [
            {"name": "User", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Mobile App", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Reservation Hub", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Vehicle Service", "type": "service", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "select vehicle", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "request reservation", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 3, "text": "check availability & battery", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 3, "text": "validate battery level (>= 20%)", "is_resp": False, "is_self": True},
            {"src": 3, "dst": 4, "text": "lock vehicle (15-min hold)", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 3, "text": "lock confirmed", "is_resp": True, "is_self": False},
            {"src": 3, "dst": 2, "text": "reservation approved", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "issue reservation ticket (QR & timer)", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display active ticket (15:00 countdown)", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 8)],
            1: [(0, 8)],
            2: [(1, 7)],
            3: [(2, 6)],
            4: [(4, 5)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 8,
            "label": "{b - a < 5 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ02-Pick_Up_Vehicle.drawio.svg",
        "title": "Sequence Diagram: SQ02 - Pick Up Vehicle (UC04)",
        "participants": [
            {"name": "User", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Mobile App", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Pickup Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Station IoT Dock", "type": "iot", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "scan QR code at vehicle dock", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "submit pickup request", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 4, "text": "validate reservation ticket", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "reservation verified", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 3, "text": "send unlock command", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 3, "text": "release physical lock mechanism", "is_resp": False, "is_self": True},
            {"src": 3, "dst": 2, "text": "dock unlocked & vehicle released", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "update vehicle state to 'In-Use'", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "trip record initiated", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "confirm unlock & start trip timer", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display trip active & safety tips", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 10)],
            1: [(0, 10)],
            2: [(1, 9)],
            3: [(4, 6)],
            4: [(2, 3), (7, 8)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 10,
            "label": "{b - a < 8 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ03-Return_Vehicle.drawio.svg",
        "title": "Sequence Diagram: SQ03 - Return Vehicle (UC05)",
        "participants": [
            {"name": "User", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Station IoT Dock", "type": "iot", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
            {"name": "Return Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Telemetry Service", "type": "service", "fill": "#f3e8ff", "stroke": "#a855f7", "text_c": "#6b21a8"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
            {"name": "Mobile App", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "insert vehicle into dock & latch", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "report vehicle plugged in", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 3, "text": "read odometer & battery level", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 2, "text": "return final telemetry data", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "close trip & calculate usage fee", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 4, "text": "deduct balance & generate receipt", "is_resp": False, "is_self": True},
            {"src": 4, "dst": 2, "text": "trip closed & payment confirmed", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "engage lock & flash green LED", "is_resp": False, "is_self": False},
            {"src": 1, "dst": 2, "text": "dock locked securely", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 5, "text": "send trip invoice & notification", "is_resp": True, "is_self": False},
            {"src": 5, "dst": 0, "text": "display trip summary & receipt", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 10)],
            1: [(0, 8)],
            2: [(1, 9)],
            3: [(2, 3)],
            4: [(4, 6)],
            5: [(9, 10)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 10,
            "label": "{b - a < 6 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ04-Request_Charging.drawio.svg",
        "title": "Sequence Diagram: SQ04 - Request Charging (UC07)",
        "participants": [
            {"name": "User", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Mobile App", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Charging Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Smart Charger IoT", "type": "iot", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "select charging slot & power tier", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "submit charging session request", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 4, "text": "verify student wallet & subscription", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "account verified", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 3, "text": "check charger port status & grid load", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 2, "text": "port ready & power allocated", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 3, "text": "activate charging port & energize cable", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 2, "text": "charging power delivered", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "create charging session record", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "session record saved", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "notify charging started & live power feed", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display charging progress & energy delivered", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 11)],
            1: [(0, 11)],
            2: [(1, 10)],
            3: [(4, 5), (6, 7)],
            4: [(2, 3), (8, 9)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 11,
            "label": "{b - a < 7 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ05-Redistribute_Vehicles.drawio.svg",
        "title": "Sequence Diagram: SQ05 - Redistribute Vehicles (UC10)",
        "participants": [
            {"name": "Operator", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Operator Dashboard", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Rebalance Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Optimization Engine", "type": "service", "fill": "#f3e8ff", "stroke": "#a855f7", "text_c": "#6b21a8"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
            {"name": "Field Staff App", "type": "ui", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "trigger rebalance analysis", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "request fleet distribution report", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 4, "text": "fetch hub inventory & demand forecast", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "return surplus & shortage data", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 3, "text": "compute optimal transfer routes", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 2, "text": "return dispatch plan", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "save dispatch orders & reserve transit slots", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "dispatch orders confirmed", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 5, "text": "assign transfer missions to drivers", "is_resp": False, "is_self": False},
            {"src": 5, "dst": 2, "text": "acknowledge mission receipt", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "return active dispatch plan & live tracking", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display transfer missions & ETA on map", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 11)],
            1: [(0, 11)],
            2: [(1, 10)],
            3: [(4, 5)],
            4: [(2, 3), (6, 7)],
            5: [(8, 9)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 11,
            "label": "{b - a < 10 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ06-Handle_Operational_Incident.drawio.svg",
        "title": "Sequence Diagram: SQ06 - Handle Operational Incident (UC11)",
        "participants": [
            {"name": "Technician", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Monitoring Dashboard", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Incident Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Station IoT Dock", "type": "iot", "fill": "#ffe4e6", "stroke": "#f43f5e", "text_c": "#9f1239"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "report dock hardware malfunction", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "submit incident report & dock ID", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 3, "text": "send emergency disable command", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 3, "text": "de-energize port & engage safety lock", "is_resp": False, "is_self": True},
            {"src": 3, "dst": 2, "text": "dock isolated & safety lock engaged", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "update dock state to 'Under Maintenance'", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 4, "text": "reroute incoming reservations to adjacent docks", "is_resp": False, "is_self": True},
            {"src": 4, "dst": 2, "text": "reroute complete & incident ticket logged", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "confirm dock isolation & issue repair ticket", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display maintenance ticket #INC-892", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 9)],
            1: [(0, 9)],
            2: [(1, 8)],
            3: [(2, 4)],
            4: [(5, 7)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 9,
            "label": "{b - a < 5 sec}",
        }
    },
    {
        "filepath": "01_Diagram/02_Sequence_Diagram/SQ07-Run_What_if_Simulation.drawio.svg",
        "title": "Sequence Diagram: SQ07 - Run What-if Simulation (UC13)",
        "participants": [
            {"name": "Planner", "type": "actor", "fill": "#f3e8ff", "stroke": "#9333ea", "text_c": "#6b21a8"},
            {"name": "Simulation Web UI", "type": "ui", "fill": "#dbeafe", "stroke": "#3b82f6", "text_c": "#1e40af"},
            {"name": "Simulation Controller", "type": "controller", "fill": "#dcfce7", "stroke": "#22c55e", "text_c": "#166534"},
            {"name": "Simulation Engine", "type": "service", "fill": "#f3e8ff", "stroke": "#a855f7", "text_c": "#6b21a8"},
            {"name": "Database", "type": "datastore", "fill": "#fef3c7", "stroke": "#f59e0b", "text_c": "#b45309"},
        ],
        "messages": [
            {"src": 0, "dst": 1, "text": "select scenario (Metro Surge + Charger Failure)", "is_resp": False, "is_self": False, "time_mark": "{a}"},
            {"src": 1, "dst": 2, "text": "submit simulation parameters & duration", "is_resp": False, "is_self": False},
            {"src": 2, "dst": 4, "text": "load historical trip & charging data", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "historical dataset loaded (50,000 trips)", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 3, "text": "execute Monte Carlo simulation run", "is_resp": False, "is_self": False},
            {"src": 3, "dst": 3, "text": "model vehicle depletion & grid peak demand", "is_resp": False, "is_self": True},
            {"src": 3, "dst": 2, "text": "return simulation results & bottlenecks", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 4, "text": "save simulation run & AI recommendations", "is_resp": False, "is_self": False},
            {"src": 4, "dst": 2, "text": "run record saved", "is_resp": True, "is_self": False},
            {"src": 2, "dst": 1, "text": "render comparative charts & recommendations", "is_resp": True, "is_self": False},
            {"src": 1, "dst": 0, "text": "display bottleneck heatmaps & fleet buffer advice", "is_resp": True, "is_self": False, "time_mark": "{b}"},
        ],
        "active_ranges": {
            0: [(0, 10)],
            1: [(0, 10)],
            2: [(1, 9)],
            3: [(4, 6)],
            4: [(2, 3), (7, 8)],
        },
        "duration_constraint": {
            "p_idx": 0,
            "start_msg_idx": 0,
            "end_msg_idx": 10,
            "label": "{b - a < 15 sec}",
        }
    }
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Regenerate only SQ01–SQ07.')
    parser.add_argument('--output-dir', type=Path, default=Path(__file__).resolve().parents[2] / '01_Diagram/02_Sequence_Diagram')
    args = parser.parse_args()
    for d in DIAGRAMS:
        create_slide_sequence_diagram(
            filepath=str(args.output_dir / Path(d['filepath']).name),
            title=d["title"],
            participants=d["participants"],
            messages=d["messages"],
            active_ranges=d["active_ranges"],
            duration_constraint=d.get("duration_constraint")
        )
    write_catalog(args.output_dir)
    print("All 7 Sequence Diagrams regenerated with slide style!")
