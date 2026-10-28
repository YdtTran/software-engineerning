import os
import html

def escape_xml(s):
    return html.escape(str(s), quote=True)

def create_drawio_svg_file(filepath, width, height, mx_cells, svg_graphics=""):
    """
    Creates a valid .drawio.svg file containing both mxGraph model and visual SVG.
    """
    mxgraph_xml = (
        '<mxfile host="Electron" modified="2026-10-28T10:00:00.000Z" agent="Antigravity UML Designer" version="21.6.8" type="device">'
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


# ==============================================================================
# 1. SEQUENCE DIAGRAM BUILDER (Chuẩn Slide Ch6 p.21-26, 40, 50)
# ==============================================================================
def build_sequence_diagram_v2(filepath, title, participants, messages, alt_boxes=None, time_constraints=None):
    """
    participants: list of dicts:
      {'name': str, 'type': 'actor'|'boundary'|'controller'|'service'|'datastore'}
    messages: list of dicts:
      {'src': int, 'dst': int, 'num': str, 'text': str, 'is_resp': bool, 'guard': str, 'is_self': bool}
    alt_boxes: list of dicts:
      {'y': int, 'h': int, 'cond_true': str, 'cond_false': str, 'mid_y': int}
    """
    num_p = len(participants)
    spacing = 185
    start_x = 70
    top_y = 65
    header_w = 130
    header_h = 45
    
    total_messages = len(messages)
    step_y = 48
    diagram_h = top_y + header_h + (total_messages + 3) * step_y + 90
    diagram_w = start_x + (num_p - 1) * spacing + header_w + 70
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title (Header chuẩn Slide ĐHQG-HCM)
    svg_elems.append(f'<rect x="20" y="15" width="{diagram_w - 40}" height="32" rx="4" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>')
    svg_elems.append(f'<text x="35" y="36" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#0369a1">{escape_xml(title)}</text>')
    svg_elems.append(f'<text x="{diagram_w - 35}" y="36" font-family="Segoe UI, sans-serif" font-size="11" fill="#64748b" text-anchor="end">UML 2.5 / Sommerville Ch6 Standard</text>')
    
    p_centers = []
    for i, p in enumerate(participants):
        p_name = p['name']
        p_type = p.get('type', 'service')
        cx = start_x + i * spacing + (header_w // 2)
        p_centers.append(cx)
        px = cx - (header_w // 2)
        
        if p_type == 'actor':
            # Stickman Actor
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#bae6fd;strokeColor=#0284c7;" vertex="1" parent="1">'
                f'<mxGeometry x="{cx - 15}" y="{top_y}" width="30" height="55" as="geometry"/>'
                f'</mxCell>'
            )
            # Lifeline
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1.5;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 65}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 40}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # SVG Visual
            svg_elems.append(f'<circle cx="{cx}" cy="{top_y + 10}" r="9" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 19}" x2="{cx}" y2="{top_y + 40}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx - 12}" y1="{top_y + 26}" x2="{cx + 12}" y2="{top_y + 26}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 40}" x2="{cx - 9}" y2="{top_y + 55}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 40}" x2="{cx + 9}" y2="{top_y + 55}" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<text x="{cx}" y="{top_y + 72}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">{escape_xml(p_name)}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 80}" x2="{cx}" y2="{diagram_h - 40}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')
            
        else:
            # Object Box (Slide 40 & 50: :ClassName or <<datastore>>)
            fill_c = "#e0f2fe" if p_type != 'datastore' else "#fef3c7"
            stroke_c = "#0284c7" if p_type != 'datastore' else "#d97706"
            text_c = "#0369a1" if p_type != 'datastore' else "#b45309"
            
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="rounded=1;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor={fill_c};strokeColor={stroke_c};strokeWidth=2;fontColor={text_c};" vertex="1" parent="1">'
                f'<mxGeometry x="{px}" y="{top_y + 15}" width="{header_w}" height="{header_h}" as="geometry"/>'
                f'</mxCell>'
            )
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1.5;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 15 + header_h}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 40}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # SVG Visual
            svg_elems.append(f'<rect x="{px}" y="{top_y + 15}" width="{header_w}" height="{header_h}" rx="6" fill="{fill_c}" stroke="{stroke_c}" stroke-width="2"/>')
            lines = p_name.split('\n')
            if len(lines) == 1:
                svg_elems.append(f'<text x="{cx}" y="{top_y + 42}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="{text_c}" text-anchor="middle">{escape_xml(p_name)}</text>')
            else:
                svg_elems.append(f'<text x="{cx}" y="{top_y + 32}" font-family="Segoe UI" font-size="10" fill="{text_c}" text-anchor="middle">{escape_xml(lines[0])}</text>')
                svg_elems.append(f'<text x="{cx}" y="{top_y + 49}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="{text_c}" text-anchor="middle">{escape_xml(lines[1])}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 15 + header_h}" x2="{cx}" y2="{diagram_h - 40}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')

    # Combined fragments (alt boxes per Visual Paradigm & Slide 21/22)
    if alt_boxes:
        for b_idx, box in enumerate(alt_boxes):
            bx = start_x - 35
            bw = (num_p - 1) * spacing + header_w + 70
            by = box['y']
            bh = box['h']
            
            mx_cells.append(
                f'<mxCell id="alt_{b_idx}" value="alt" style="shape=umlFrame;whiteSpace=wrap;html=1;width=50;height=22;fontFamily=Segoe UI;fontSize=11;fontStyle=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=1.5;" vertex="1" parent="1">'
                f'<mxGeometry x="{bx}" y="{by}" width="{bw}" height="{bh}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="#f8fafc" fill-opacity="0.6" stroke="#64748b" stroke-width="1.5"/>')
            svg_elems.append(f'<polygon points="{bx},{by} {bx+50},{by} {bx+60},{by+20} {bx},{by+20}" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>')
            svg_elems.append(f'<text x="{bx+10}" y="{by+15}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#334155">alt</text>')
            
            if 'cond_true' in box:
                svg_elems.append(f'<text x="{bx+70}" y="{by+15}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0284c7">[{escape_xml(box["cond_true"])}]</text>')
            if 'mid_y' in box and 'cond_false' in box:
                my = box['mid_y']
                svg_elems.append(f'<line x1="{bx}" y1="{my}" x2="{bx+bw}" y2="{my}" stroke="#64748b" stroke-dasharray="6 4" stroke-width="1.5"/>')
                svg_elems.append(f'<text x="{bx+15}" y="{my+16}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#dc2626">[{escape_xml(box["cond_false"])}]</text>')

    # Activation Boxes and Messages (Slide Ch6 p.22, 40, 50)
    curr_y = top_y + 115
    for m_idx, m in enumerate(messages):
        src = m['src']
        dst = m['dst']
        num_str = m.get('num', f"{m_idx+1}:")
        msg_text = m['text']
        guard = m.get('guard', '')
        is_resp = m.get('is_resp', False)
        is_self = m.get('is_self', False)
        
        full_label = f"{num_str} {guard} {msg_text}".replace("  ", " ").strip()
        
        x1 = p_centers[src]
        x2 = p_centers[dst]
        y = curr_y
        curr_y += step_y
        
        # Activation Box on target (Slide 22 & 40)
        act_w = 12
        if not is_self:
            svg_elems.append(f'<rect x="{x2 - act_w//2}" y="{y - 5}" width="{act_w}" height="36" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>')
            # Sender also has active box
            svg_elems.append(f'<rect x="{x1 - act_w//2}" y="{y - 5}" width="{act_w}" height="36" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>')
        
        if is_self:
            # Self-call loop (Slide 40 Validate())
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(full_label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#0369a1;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0f172a;endArrow=block;endFill=1;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x1 + act_w//2}" y="{y - 10}" as="sourcePoint"/>'
                f'<mxPoint x="{x1 + act_w//2}" y="{y + 15}" as="targetPoint"/>'
                f'<Array as="points">'
                f'<mxPoint x="{x1 + 35}" y="{y - 10}"/>'
                f'<mxPoint x="{x1 + 35}" y="{y + 15}"/>'
                f'</Array>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            svg_elems.append(f'<path d="M {x1 + act_w//2} {y - 10} L {x1 + 40} {y - 10} L {x1 + 40} {y + 15} L {x1 + act_w//2 + 4} {y + 15}" fill="none" stroke="#0369a1" stroke-width="1.5"/>')
            svg_elems.append(f'<polygon points="{x1 + act_w//2},{y+15} {x1 + act_w//2 + 8},{y+11} {x1 + act_w//2 + 8},{y+19}" fill="#0369a1"/>')
            svg_elems.append(f'<text x="{x1 + 46}" y="{y + 5}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0f172a">{escape_xml(full_label)}</text>')
            
        elif is_resp:
            # Return Response: Dashed arrow with open head (Slide 22 eject card / account not ok)
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(full_label)}" style="html=1;verticalAlign=bottom;endArrow=open;dashed=1;strokeColor=#0284c7;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0369a1;fontStyle=2;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x1}" y="{y}" as="sourcePoint"/>'
                f'<mxPoint x="{x2}" y="{y}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#0284c7" stroke-dasharray="5 4" stroke-width="1.5"/>')
            # Open stick arrowhead (<--)
            dx = 8 if x2 < x1 else -8
            svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2 + dx}" y2="{y - 5}" stroke="#0284c7" stroke-width="1.5"/>')
            svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2 + dx}" y2="{y + 5}" stroke="#0284c7" stroke-width="1.5"/>')
            label_x = (x1 + x2) // 2
            svg_elems.append(f'<rect x="{label_x - 90}" y="{y - 17}" width="180" height="15" fill="#ffffff" fill-opacity="0.9"/>')
            svg_elems.append(f'<text x="{label_x}" y="{y - 5}" font-family="Segoe UI" font-size="11" font-style="italic" fill="#0369a1" text-anchor="middle">{escape_xml(full_label)}</text>')
            
        else:
            # Synchronous Request: Solid arrow with filled head (Slide 22 & 50)
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(full_label)}" style="html=1;verticalAlign=bottom;endArrow=block;endFill=1;dashed=0;strokeColor=#0f172a;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0f172a;fontStyle=1;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x1}" y="{y}" as="sourcePoint"/>'
                f'<mxPoint x="{x2}" y="{y}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#0f172a" stroke-width="1.5"/>')
            dx = 8 if x2 < x1 else -8
            svg_elems.append(f'<polygon points="{x2},{y} {x2 + dx},{y - 4} {x2 + dx},{y + 4}" fill="#0f172a"/>')
            label_x = (x1 + x2) // 2
            svg_elems.append(f'<rect x="{label_x - 90}" y="{y - 17}" width="180" height="15" fill="#ffffff" fill-opacity="0.9"/>')
            svg_elems.append(f'<text x="{label_x}" y="{y - 5}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">{escape_xml(full_label)}</text>')

    create_drawio_svg_file(filepath, diagram_w, diagram_h, mx_cells, "".join(svg_elems))


# ==============================================================================
# 2. ACTIVITY DIAGRAM WITH SWIMLANES & OBJECT FLOW (Chuẩn Slide Ch6 p.51, 52)
# ==============================================================================
def build_activity_diagram_swimlanes(filepath, title, swimlanes, nodes, edges):
    """
    swimlanes: list of strings (column names, e.g. ["Student (Người dùng)", "Mobile App", "Backend Controller", "IoT Station"])
    nodes: list of dicts:
      {'id': str, 'lane': int, 'type': 'start'|'action'|'decision'|'fork'|'join'|'object'|'end', 'text': str, 'y': int, 'w': int, 'h': int}
    edges: list of dicts:
      {'src': str, 'dst': str, 'label': str, 'is_object_flow': bool, 'points': [(x,y), ...]}
    """
    num_lanes = len(swimlanes)
    lane_w = 220
    header_h = 45
    start_x = 40
    start_y = 60
    
    max_y = max(n['y'] + n.get('h', 50) for n in nodes) + 80
    diagram_w = start_x + num_lanes * lane_w + 40
    diagram_h = max_y
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title
    svg_elems.append(f'<rect x="20" y="15" width="{diagram_w - 40}" height="32" rx="4" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>')
    svg_elems.append(f'<text x="35" y="36" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#0369a1">{escape_xml(title)}</text>')
    svg_elems.append(f'<text x="{diagram_w - 35}" y="36" font-family="Segoe UI, sans-serif" font-size="11" fill="#64748b" text-anchor="end">UML 2.5 Swimlanes / Sommerville Ch6 p.52</text>')
    
    # Swimlane Columns (Slide Ch6 p.52)
    for l_idx, l_name in enumerate(swimlanes):
        lx = start_x + l_idx * lane_w
        ly = start_y
        lh = diagram_h - start_y - 30
        
        mx_cells.append(
            f'<mxCell id="lane_{l_idx}" value="{escape_xml(l_name)}" style="swimlane;whiteSpace=wrap;html=1;startSize={header_h};fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#f8fafc;strokeColor=#cbd5e1;strokeWidth=1.5;fontColor=#0f172a;" vertex="1" parent="1">'
            f'<mxGeometry x="{lx}" y="{ly}" width="{lane_w}" height="{lh}" as="geometry"/>'
            f'</mxCell>'
        )
        # SVG Swimlane
        svg_elems.append(f'<rect x="{lx}" y="{ly}" width="{lane_w}" height="{lh}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>')
        svg_elems.append(f'<rect x="{lx}" y="{ly}" width="{lane_w}" height="{header_h}" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>')
        svg_elems.append(f'<text x="{lx + lane_w//2}" y="{ly + 28}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">{escape_xml(l_name)}</text>')

    # Calculate absolute coordinates for nodes
    node_coords = {}
    for n in nodes:
        nid = n['id']
        lane_idx = n['lane']
        lane_x = start_x + lane_idx * lane_w
        w = n.get('w', 150)
        h = n.get('h', 50)
        x = lane_x + (lane_w - w) // 2
        y = n['y']
        node_coords[nid] = {'x': x, 'y': y, 'w': w, 'h': h, 'type': n['type'], 'lane': lane_idx}
        text = n.get('text', '')
        ntype = n['type']
        
        if ntype == 'start':
            # Initial state: solid black circle (Slide 51)
            mx_cells.append(
                f'<mxCell id="{nid}" value="" style="ellipse;fillColor=#0f172a;strokeColor=none;html=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<circle cx="{x + w//2}" cy="{y + h//2}" r="{w//2}" fill="#0f172a" stroke="none"/>')
            
        elif ntype == 'action':
            # Action state: rounded rectangle starting with active verb (Slide 51)
            mx_cells.append(
                f'<mxCell id="{nid}" value="{escape_xml(text)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=30;fontFamily=Segoe UI;fontSize=11;fontStyle=1;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=1.5;fontColor=#0369a1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>')
            lines = text.split('\n')
            start_ty = y + (h // 2) - ((len(lines) - 1) * 7) + 4
            for li, line in enumerate(lines):
                svg_elems.append(f'<text x="{x + w//2}" y="{start_ty + li * 14}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">{escape_xml(line)}</text>')
                
        elif ntype == 'decision':
            # Decision / Merge: diamond (Slide 51)
            mx_cells.append(
                f'<mxCell id="{nid}" value="{escape_xml(text)}" style="rhombus;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=10;fontStyle=1;fillColor=#fef08a;strokeColor=#ca8a04;strokeWidth=1.5;fontColor=#854d0e;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            pts = f"{x + w//2},{y} {x + w},{y + h//2} {x + w//2},{y + h} {x},{y + h//2}"
            svg_elems.append(f'<polygon points="{pts}" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>')
            if text:
                svg_elems.append(f'<text x="{x + w//2}" y="{y + h//2 + 4}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#854d0e" text-anchor="middle">{escape_xml(text)}</text>')
                
        elif ntype in ['fork', 'join']:
            # Concurrency fork/join bar (Slide 51 & 52)
            mx_cells.append(
                f'<mxCell id="{nid}" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#0f172a;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#0f172a" stroke="#0f172a"/>')
            
        elif ntype == 'object':
            # Object Flow: rectangle :Object [state] (Slide 51 & 52)
            mx_cells.append(
                f'<mxCell id="{nid}" value="{escape_xml(text)}" style="rounded=0;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=10;fontStyle=2;fillColor=#f1f5f9;strokeColor=#64748b;strokeWidth=1.5;dashed=1;fontColor=#334155;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3 3"/>')
            lines = text.split('\n')
            start_ty = y + (h // 2) - ((len(lines) - 1) * 6) + 4
            for li, line in enumerate(lines):
                svg_elems.append(f'<text x="{x + w//2}" y="{start_ty + li * 13}" font-family="Segoe UI" font-size="10" font-style="italic" fill="#334155" text-anchor="middle">{escape_xml(line)}</text>')
                
        elif ntype == 'end':
            # Bullseye Final State (Slide 51)
            mx_cells.append(
                f'<mxCell id="{nid}" value="" style="ellipse;html=1;shape=endState;fillColor=#0284c7;strokeColor=#0284c7;strokeWidth=2;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            cx, cy = x + w//2, y + h//2
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2}" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>')
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2 - 4}" fill="#0284c7" stroke="none"/>')

    # Render Edges
    for e_idx, e in enumerate(edges):
        src = node_coords[e['src']]
        dst = node_coords[e['dst']]
        label = e.get('label', '')
        is_obj = e.get('is_object_flow', False)
        
        stroke_c = "#64748b" if is_obj else "#334155"
        dash_str = "dashed=1;" if is_obj else "dashed=0;"
        
        mx_cells.append(
            f'<mxCell id="e_{e_idx}" value="{escape_xml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor={stroke_c};strokeWidth=1.5;fontFamily=Segoe UI;fontSize=10;fontColor=#0284c7;fontStyle=1;{dash_str}" edge="1" parent="1" source="{e["src"]}" target="{e["dst"]}">'
            f'<mxGeometry relative="1" as="geometry"/>'
            f'</mxCell>'
        )
        
        # Coordinates
        x1 = e.get('x1', src['x'] + src['w']//2)
        y1 = e.get('y1', src['y'] + src['h'])
        x2 = e.get('x2', dst['x'] + dst['w']//2)
        y2 = e.get('y2', dst['y'])
        
        dash_svg = 'stroke-dasharray="4 3"' if is_obj else ''
        
        if x1 == x2:
            svg_elems.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke_c}" stroke-width="1.5" {dash_svg}/>')
            svg_elems.append(f'<polygon points="{x2},{y2} {x2-4},{y2-8} {x2+4},{y2-8}" fill="{stroke_c}"/>')
            if label:
                svg_elems.append(f'<text x="{x1 + 8}" y="{(y1+y2)//2}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#0284c7">{escape_xml(label)}</text>')
        else:
            mid_y = e.get('mid_y', y1 + 18 if y2 > y1 else y1 - 18)
            svg_elems.append(f'<path d="M {x1} {y1} L {x1} {mid_y} L {x2} {mid_y} L {x2} {y2}" fill="none" stroke="{stroke_c}" stroke-width="1.5" {dash_svg}/>')
            arr_dy = -8 if y2 >= mid_y else 8
            svg_elems.append(f'<polygon points="{x2},{y2} {x2-4},{y2+arr_dy} {x2+4},{y2+arr_dy}" fill="{stroke_c}"/>')
            if label:
                svg_elems.append(f'<rect x="{(x1+x2)//2 - 40}" y="{mid_y - 14}" width="80" height="13" fill="#ffffff" fill-opacity="0.9"/>')
                svg_elems.append(f'<text x="{(x1+x2)//2}" y="{mid_y - 4}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#0284c7" text-anchor="middle">{escape_xml(label)}</text>')

    create_drawio_svg_file(filepath, diagram_w, diagram_h, mx_cells, "".join(svg_elems))


# ==============================================================================
# 3. STATECHART DIAGRAM BUILDER (Chuẩn Slide Ch6 p.41-45 Microwave Oven)
# ==============================================================================
def build_statechart_diagram_v2(filepath, title, superstates=None, states=None, transitions=None):
    """
    states: list of dicts:
      {'id': str, 'type': 'initial'|'state'|'final', 'name': str, 'actions': list of str, 'x': int, 'y': int, 'w': int, 'h': int}
    superstates: list of dicts:
      {'id': str, 'name': str, 'x': int, 'y': int, 'w': int, 'h': int}
    transitions: list of dicts:
      {'src': str, 'dst': str, 'event': str, 'guard': str, 'action': str, 'x1': int, 'y1': int, 'x2': int, 'y2': int}
    """
    state_map = {s['id']: s for s in states}
    
    max_x = max(s['x'] + s['w'] for s in states)
    if superstates:
        max_x = max(max_x, max(ss['x'] + ss['w'] for ss in superstates))
    max_x += 80
    
    max_y = max(s['y'] + s['h'] for s in states)
    if superstates:
        max_y = max(max_y, max(ss['y'] + ss['h'] for ss in superstates))
    max_y += 80
    
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Title
    svg_elems.append(f'<rect x="20" y="15" width="{max_x - 40}" height="32" rx="4" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>')
    svg_elems.append(f'<text x="35" y="36" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#15803d">{escape_xml(title)}</text>')
    svg_elems.append(f'<text x="{max_x - 35}" y="36" font-family="Segoe UI, sans-serif" font-size="11" fill="#64748b" text-anchor="end">UML State Machine / Sommerville Ch6 p.42-45</text>')
    
    # Superstates (Slide 43 Operation Superstate)
    if superstates:
        for ss in superstates:
            ssid = ss['id']
            ssname = ss['name']
            sx, sy, sw, sh = ss['x'], ss['y'], ss['w'], ss['h']
            mx_cells.append(
                f'<mxCell id="{ssid}" value="{escape_xml(ssname)}" style="swimlane;whiteSpace=wrap;html=1;startSize=26;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#ecfdf5;strokeColor=#059669;strokeWidth=2;fontColor=#065f46;arcSize=14;rounded=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{sx}" y="{sy}" width="{sw}" height="{sh}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="14" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>')
            svg_elems.append(f'<rect x="{sx}" y="{sy}" width="{sw}" height="26" rx="14" fill="#a7f3d0" stroke="none"/>')
            svg_elems.append(f'<text x="{sx + 15}" y="{sy + 18}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="#065f46">{escape_xml(ssname)} (Superstate)</text>')

    # States
    for s in states:
        sid = s['id']
        stype = s['type']
        x, y, w, h = s['x'], s['y'], s['w'], s['h']
        name = s.get('name', '')
        actions = s.get('actions', [])
        
        if stype == 'initial':
            mx_cells.append(
                f'<mxCell id="{sid}" value="" style="ellipse;fillColor=#0f172a;strokeColor=none;html=1;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<circle cx="{x + w//2}" cy="{y + h//2}" r="{w//2}" fill="#0f172a" stroke="none"/>')
            
        elif stype == 'state':
            # 2-compartment state box (Slide 42 & 44)
            mx_cells.append(
                f'<mxCell id="{sid}" value="{escape_xml(name)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor=#f0fdf4;strokeColor=#16a34a;strokeWidth=2;fontColor=#15803d;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            svg_elems.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>')
            # Divider line between Name and Internal Actions
            svg_elems.append(f'<line x1="{x}" y1="{y + 24}" x2="{x + w}" y2="{y + 24}" stroke="#86efac" stroke-width="1.5"/>')
            svg_elems.append(f'<text x="{x + w//2}" y="{y + 17}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#15803d" text-anchor="middle">{escape_xml(name)}</text>')
            
            # Internal actions (entry /, do:, exit /)
            for ai, act in enumerate(actions):
                svg_elems.append(f'<text x="{x + 8}" y="{y + 39 + ai * 14}" font-family="Segoe UI" font-size="10" fill="#166534">{escape_xml(act)}</text>')
                
        elif stype == 'final':
            # Bullseye Final state
            mx_cells.append(
                f'<mxCell id="{sid}" value="" style="ellipse;html=1;shape=endState;fillColor=#16a34a;strokeColor=#16a34a;strokeWidth=2;" vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )
            cx, cy = x + w//2, y + h//2
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2}" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>')
            svg_elems.append(f'<circle cx="{cx}" cy="{cy}" r="{w//2 - 4}" fill="#16a34a" stroke="none"/>')

    # Transitions (Slide 42: event [guard] / action)
    for t_idx, t in enumerate(transitions):
        src = state_map[t['src']]
        dst = state_map[t['dst']]
        
        event_str = t.get('event', '')
        guard_str = f" [{t['guard']}]" if t.get('guard') else ""
        action_str = f" / {t['action']}" if t.get('action') else ""
        full_label = f"{event_str}{guard_str}{action_str}".strip()
        
        x1 = t.get('x1', src['x'] + src['w']//2)
        y1 = t.get('y1', src['y'] + src['h']//2)
        x2 = t.get('x2', dst['x'] + dst['w']//2)
        y2 = t.get('y2', dst['y'] + dst['h']//2)
        
        mx_cells.append(
            f'<mxCell id="t_{t_idx}" value="{escape_xml(full_label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#047857;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=10;fontColor=#047857;fontStyle=1;" edge="1" parent="1" source="{t["src"]}" target="{t["dst"]}">'
            f'<mxGeometry relative="1" as="geometry"/>'
            f'</mxCell>'
        )
        
        mid_x = (x1 + x2) // 2
        mid_y = (y1 + y2) // 2
        
        # Line
        svg_elems.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#047857" stroke-width="1.5"/>')
        dx = -6 if x2 >= x1 else 6
        svg_elems.append(f'<polygon points="{x2},{y2} {x2+dx},{y2-4} {x2+dx},{y2+4}" fill="#047857"/>')
        
        if full_label:
            svg_elems.append(f'<rect x="{mid_x - 70}" y="{mid_y - 13}" width="140" height="14" fill="#ffffff" fill-opacity="0.95"/>')
            svg_elems.append(f'<text x="{mid_x}" y="{mid_y - 2}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#047857" text-anchor="middle">{escape_xml(full_label)}</text>')

    create_drawio_svg_file(filepath, max_x, max_y, mx_cells, "".join(svg_elems))
