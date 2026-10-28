import os
import html

def escape_xml(s):
    return html.escape(s, quote=True)

def create_drawio_svg_file(filepath, width, height, mx_cells, svg_graphics=""):
    """
    Creates a valid .drawio.svg file that:
    1. Contains embedded Draw.io mxfile model inside content="..." attribute.
    2. Has visual SVG nodes inside <g> for previewing directly in VS Code / image viewers.
    """
    mxgraph_xml = (
        '<mxfile host="Electron" modified="2026-10-28T09:00:00.000Z" agent="Antigravity UML Designer" version="21.6.8" type="device">'
        '<diagram id="diagram_1" name="Page-1">'
        f'<mxGraphModel dx="{width}" dy="{height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">'
        '<root>'
        + "".join(mx_cells) +
        '</root>'
        '</mxGraphModel>'
        '</diagram>'
        '</mxfile>'
    )
    content_escaped = escape_xml(mxgraph_xml)
    
    # Base SVG envelope
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="{width}px" height="{height}px" viewBox="-0.5 -0.5 {width} {height}" content="{content_escaped}">'
        f'<defs/>'
        f'<g>'
        f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff" stroke="none"/>'
        + svg_graphics +
        f'</g>'
        f'</svg>'
    ]
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("".join(svg))
    print(f"Created: {filepath}")

# Sequence Diagram Builder
def build_sequence_diagram(filepath, title, actor_name, lifelines, messages, alt_boxes=None):
    """
    Builds a professional Sequence Diagram.
    lifelines: list of strings [name1, name2, ...]
    messages: list of tuples: (from_idx, to_idx, text, is_response)
    alt_boxes: list of dicts: {'y': int, 'h': int, 'condition_true': str, 'condition_false': str, 'mid_y': int}
    """
    all_participants = [actor_name] + lifelines
    num_p = len(all_participants)
    
    spacing = 180
    start_x = 80
    top_y = 60
    header_h = 40
    header_w = 120
    
    total_messages = len(messages)
    step_y = 45
    diagram_h = top_y + header_h + (total_messages + 3) * step_y + 80
    diagram_w = start_x + (num_p - 1) * spacing + header_w + 80
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title
    svg_elems.append(f'<text x="30" y="35" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#152584">{escape_xml(title)}</text>')
    
    # Participants
    p_centers = []
    for i, p_name in enumerate(all_participants):
        cx = start_x + i * spacing + (header_w // 2)
        p_centers.append(cx)
        px = cx - (header_w // 2)
        
        # mxCell for participant
        if i == 0:
            # Actor
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#bae6fd;strokeColor=#0284c7;" vertex="1" parent="1">'
                f'<mxGeometry x="{cx - 15}" y="{top_y}" width="30" height="60" as="geometry"/>'
                f'</mxCell>'
            )
            # Lifeline line
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 70}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 40}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # Visual SVG
            svg_elems.append(f'<circle cx="{cx}" cy="{top_y + 12}" r="10" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 22}" x2="{cx}" y2="{top_y + 45}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx - 12}" y1="{top_y + 30}" x2="{cx + 12}" y2="{top_y + 30}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 45}" x2="{cx - 10}" y2="{top_y + 60}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 45}" x2="{cx + 10}" y2="{top_y + 60}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<text x="{cx}" y="{top_y + 78}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">{escape_xml(p_name)}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 85}" x2="{cx}" y2="{diagram_h - 40}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')
        else:
            # Component Box
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="rounded=1;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;" vertex="1" parent="1">'
                f'<mxGeometry x="{px}" y="{top_y + 20}" width="{header_w}" height="{header_h}" as="geometry"/>'
                f'</mxCell>'
            )
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 20 + header_h}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 40}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{px}" y="{top_y + 20}" width="{header_w}" height="{header_h}" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<text x="{cx}" y="{top_y + 45}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#0369a1" text-anchor="middle">{escape_xml(p_name)}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 20 + header_h}" x2="{cx}" y2="{diagram_h - 40}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')

    # Alt Boxes if any
    if alt_boxes:
        for b_idx, box in enumerate(alt_boxes):
            bx = start_x - 30
            bw = (num_p - 1) * spacing + header_w + 60
            by = box['y']
            bh = box['h']
            mx_cells.append(
                f'<mxCell id="alt_{b_idx}" value="alt" style="shape=umlFrame;whiteSpace=wrap;html=1;width=50;height=20;fontFamily=Segoe UI;fontSize=11;fontStyle=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{bx}" y="{by}" width="{bw}" height="{bh}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="#f8fafc" fill-opacity="0.7" stroke="#64748b" stroke-width="1.5"/>')
            svg_elems.append(f'<polygon points="{bx},{by} {bx+45},{by} {bx+55},{by+18} {bx},{by+18}" fill="#e2e8f0" stroke="#64748b"/>')
            svg_elems.append(f'<text x="{bx+8}" y="{by+13}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#334155">alt</text>')
            
            if 'condition_true' in box:
                svg_elems.append(f'<text x="{bx+65}" y="{by+14}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0284c7">[{escape_xml(box["condition_true"])}]</text>')
            if 'mid_y' in box and 'condition_false' in box:
                my = box['mid_y']
                svg_elems.append(f'<line x1="{bx}" y1="{my}" x2="{bx+bw}" y2="{my}" stroke="#64748b" stroke-dasharray="6 4" stroke-width="1.5"/>')
                svg_elems.append(f'<text x="{bx+15}" y="{my+16}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#dc2626">[{escape_xml(box["condition_false"])}]</text>')

    # Messages
    curr_y = top_y + 110
    for m_idx, (src, dst, text, is_resp) in enumerate(messages):
        x1 = p_centers[src]
        x2 = p_centers[dst]
        y = curr_y
        curr_y += step_y
        
        # Activation boxes on dst
        act_w = 10
        svg_elems.append(f'<rect x="{x2 - act_w//2}" y="{y - 5}" width="{act_w}" height="35" fill="#f1f5f9" stroke="#0284c7" stroke-width="1.5"/>')
        
        # Message style
        stroke_color = "#475569" if not is_resp else "#0284c7"
        dash_str = 'dashed=1;' if is_resp else 'dashed=0;'
        end_arrow = 'open' if is_resp else 'block'
        
        mx_cells.append(
            f'<mxCell id="msg_{m_idx}" value="{escape_xml(text)}" style="html=1;verticalAlign=bottom;endArrow={end_arrow};{dash_str}strokeColor={stroke_color};strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0f172a;" edge="1" parent="1">'
            f'<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{x1}" y="{y}" as="sourcePoint"/>'
            f'<mxPoint x="{x2}" y="{y}" as="targetPoint"/>'
            f'</mxGeometry>'
            f'</mxCell>'
        )
        
        # SVG line
        if is_resp:
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{stroke_color}" stroke-dasharray="4 4" stroke-width="1.5"/>')
        else:
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{stroke_color}" stroke-width="1.5"/>')
            
        # Arrowhead
        arrow_dx = -8 if x2 > x1 else 8
        svg_elems.append(f'<polygon points="{x2},{y} {x2+arrow_dx},{y-4} {x2+arrow_dx},{y+4}" fill="{stroke_color}"/>')
        
        # Label text
        label_x = (x1 + x2) // 2
        label_anchor = "middle"
        svg_elems.append(f'<rect x="{label_x - 70}" y="{y - 18}" width="140" height="15" fill="#ffffff" fill-opacity="0.85" stroke="none"/>')
        svg_elems.append(f'<text x="{label_x}" y="{y - 6}" font-family="Segoe UI" font-size="11" fill="#1e293b" text-anchor="{label_anchor}">{escape_xml(text)}</text>')

    create_drawio_svg_file(filepath, diagram_w, diagram_h, mx_cells, "".join(svg_elems))


# Activity Diagram Builder
def build_activity_diagram(filepath, title, nodes, edges):
    """
    Builds a professional Activity Diagram with Start, Decision (◇), Action, and End.
    nodes: list of dicts: {'id': str, 'type': 'start'|'action'|'decision'|'end', 'text': str, 'x': int, 'y': int, 'w': int, 'h': int}
    edges: list of dicts: {'src': str, 'dst': str, 'label': str}
    """
    node_map = {n['id']: n for n in nodes}
    
    # Calculate bounding box
    max_x = max(n['x'] + n['w'] for n in nodes) + 80
    max_y = max(n['y'] + n['h'] for n in nodes) + 80
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title
    svg_elems.append(f'<text x="30" y="35" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#152584">{escape_xml(title)}</text>')
    
    # Render Nodes
    for n in nodes:
        nid = n['id']
        ntype = n['type']
        x, y, w, h = n['x'], n['y'], n['w'], n['h']
        text = n.get('text', '')
        
        if ntype == 'start':
            mx_cells.append(
                f'<mxCell id="{nid}" value="" style="ellipse;fillColor=#0284c7;strokeColor=none;html=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<circle cx="{x + w//2}" cy="{y + h//2}" r="{w//2}" fill="#0284c7" stroke="none"/>')
            
        elif ntype == 'action':
            mx_cells.append(
                f'<mxCell id="{nid}" value="{escape_xml(text)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=30;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;fontColor=#0369a1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>')
            # Text wrapping/centering
            lines = text.split('\n')
            line_start_y = y + (h // 2) - ((len(lines) - 1) * 7) + 4
            for l_idx, line in enumerate(lines):
                svg_elems.append(f'<text x="{x + w//2}" y="{line_start_y + l_idx * 15}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#0369a1" text-anchor="middle">{escape_xml(line)}</text>')
                
        elif ntype == 'decision':
            mx_cells.append(
                f'<mxCell id="{nid}" value="{escape_xml(text)}" style="rhombus;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=11;fontStyle=1;fillColor=#fef08a;strokeColor=#ca8a04;strokeWidth=2;fontColor=#854d0e;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            pts = f"{x + w//2},{y} {x + w},{y + h//2} {x + w//2},{y + h} {x},{y + h//2}"
            svg_elems.append(f'<polygon points="{pts}" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>')
            if text:
                svg_elems.append(f'<text x="{x + w//2}" y="{y + h//2 + 4}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#854d0e" text-anchor="middle">{escape_xml(text)}</text>')
                
        elif ntype == 'end':
            mx_cells.append(
                f'<mxCell id="{nid}" value="" style="ellipse;html=1;shape=endState;fillColor=#0284c7;strokeColor=#0284c7;strokeWidth=2;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            cx, cy = x + w//2, y + h//2
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2}" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2 - 4}" fill="#0284c7" stroke="none"/>')

    # Render Edges
    for e_idx, edge in enumerate(edges):
        src = node_map[edge['src']]
        dst = node_map[edge['dst']]
        label = edge.get('label', '')
        
        # Simple routing: src bottom to dst top, or custom points
        x1 = edge.get('x1', src['x'] + src['w']//2)
        y1 = edge.get('y1', src['y'] + src['h'])
        x2 = edge.get('x2', dst['x'] + dst['w']//2)
        y2 = edge.get('y2', dst['y'])
        
        mx_cells.append(
            f'<mxCell id="e_{e_idx}" value="{escape_xml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0284c7;fontStyle=1;" edge="1" parent="1" source="{edge["src"]}" target="{edge["dst"]}">'
            f'<mxGeometry relative="1" as="geometry"/>'
            f'</mxCell>'
        )
        
        # Draw line and arrow in SVG
        if x1 == x2:
            svg_elems.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#475569" stroke-width="1.5"/>')
            svg_elems.append(f'<polygon points="{x2},{y2} {x2-4},{y2-8} {x2+4},{y2-8}" fill="#475569"/>')
            if label:
                svg_elems.append(f'<text x="{x1 + 10}" y="{(y1+y2)//2}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0284c7">{escape_xml(label)}</text>')
        else:
            # Orthogonal 2-segment or 3-segment
            mid_y = y1 + 20 if y2 > y1 else y1 - 20
            svg_elems.append(f'<path d="M {x1} {y1} L {x1} {mid_y} L {x2} {mid_y} L {x2} {y2}" fill="none" stroke="#475569" stroke-width="1.5"/>')
            arr_dy = -8 if y2 >= mid_y else 8
            svg_elems.append(f'<polygon points="{x2},{y2} {x2-4},{y2+arr_dy} {x2+4},{y2+arr_dy}" fill="#475569"/>')
            if label:
                svg_elems.append(f'<text x="{(x1+x2)//2}" y="{mid_y - 6}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle">{escape_xml(label)}</text>')

    create_drawio_svg_file(filepath, max_x, max_y, mx_cells, "".join(svg_elems))


# Statechart Diagram Builder
def build_statechart_diagram(filepath, title, states, transitions):
    """
    Builds a professional UML State-Machine / Statechart Diagram.
    states: list of dicts: {'id': str, 'type': 'initial'|'state'|'final', 'name': str, 'x': int, 'y': int, 'w': int, 'h': int}
    transitions: list of dicts: {'src': str, 'dst': str, 'event': str, 'guard': str, 'action': str}
    """
    state_map = {s['id']: s for s in states}
    max_x = max(s['x'] + s['w'] for s in states) + 100
    max_y = max(s['y'] + s['h'] for s in states) + 100
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title
    svg_elems.append(f'<text x="30" y="35" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#152584">{escape_xml(title)}</text>')
    
    for s in states:
        sid = s['id']
        stype = s['type']
        x, y, w, h = s['x'], s['y'], s['w'], s['h']
        name = s.get('name', '')
        
        if stype == 'initial':
            mx_cells.append(
                f'<mxCell id="{sid}" value="" style="ellipse;fillColor=#152584;strokeColor=none;html=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<circle cx="{x + w//2}" cy="{y + h//2}" r="{w//2}" fill="#152584" stroke="none"/>')
            
        elif stype == 'state':
            mx_cells.append(
                f'<mxCell id="{sid}" value="{escape_xml(name)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#f0fdf4;strokeColor=#16a34a;strokeWidth=2;fontColor=#15803d;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{x}" y1="{y + 25}" x2="{x + w}" y2="{y + 25}" stroke="#bbf7d0" stroke-width="1"/>')
            svg_elems.append(f'<text x="{x + w//2}" y="{y + 17}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#15803d" text-anchor="middle">{escape_xml(name)}</text>')
            
        elif stype == 'final':
            mx_cells.append(
                f'<mxCell id="{sid}" value="" style="ellipse;html=1;shape=endState;fillColor=#152584;strokeColor=#152584;strokeWidth=2;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            cx, cy = x + w//2, y + h//2
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2}" fill="#ffffff" stroke="#152584" stroke-width="2"/>')
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2 - 4}" fill="#152584" stroke="none"/>')

    for t_idx, t in enumerate(transitions):
        src = state_map[t['src']]
        dst = state_map[t['dst']]
        
        event_str = t.get('event', '')
        guard_str = f" [{t['guard']}]" if t.get('guard') else ""
        action_str = f" / {t['action']}" if t.get('action') else ""
        full_label = f"{event_str}{guard_str}{action_str}"
        
        x1 = t.get('x1', src['x'] + src['w']//2)
        y1 = t.get('y1', src['y'] + src['h']//2)
        x2 = t.get('x2', dst['x'] + dst['w']//2)
        y2 = t.get('y2', dst['y'] + dst['h']//2)
        
        mx_cells.append(
            f'<mxCell id="t_{t_idx}" value="{escape_xml(full_label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#0f766e;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=10;fontColor=#0f766e;fontStyle=1;" edge="1" parent="1" source="{t["src"]}" target="{t["dst"]}">'
            f'<mxGeometry relative="1" as="geometry"/>'
            f'</mxCell>'
        )
        
        # Line & arrow
        mid_x = (x1 + x2) // 2
        mid_y = (y1 + y2) // 2
        svg_elems.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#0f766e" stroke-width="1.5"/>')
        
        # Calculate angle for arrowhead
        arr_dx = -6 if x2 >= x1 else 6
        svg_elems.append(f'<polygon points="{x2},{y2} {x2+arr_dx},{y2-4} {x2+arr_dx},{y2+4}" fill="#0f766e"/>')
        if full_label:
            svg_elems.append(f'<rect x="{mid_x - 60}" y="{mid_y - 14}" width="120" height="14" fill="#ffffff" fill-opacity="0.9"/>')
            svg_elems.append(f'<text x="{mid_x}" y="{mid_y - 3}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#0f766e" text-anchor="middle">{escape_xml(full_label)}</text>')

    create_drawio_svg_file(filepath, max_x, max_y, mx_cells, "".join(svg_elems))

print("Builder helper ready.")
