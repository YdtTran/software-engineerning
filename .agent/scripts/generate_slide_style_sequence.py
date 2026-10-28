import os
import html
import fitz

def escape_xml(s):
    return html.escape(str(s), quote=True)

def create_slide_sequence_diagram(
    filepath,
    title,
    participants,
    messages,
    active_ranges,
    duration_constraint=None
):
    """
    Creates a Sequence Diagram .drawio.svg adhering strictly to
    Slide Ch6 p.22-26 'SEQUENCE DIAGRAMS - EXAMPLE'.
    """
    num_p = len(participants)
    spacing = 180
    start_x = 135          # Ample space on left for dimension constraint
    top_y = 65
    header_w = 140
    header_h = 44
    step_y = 48
    msg_start_y = top_y + 115
    
    total_messages = len(messages)
    diagram_h = msg_start_y + (total_messages + 1) * step_y + 50
    diagram_w = start_x + (num_p - 1) * spacing + header_w + 50
    
    # Calculate message Y coordinates
    msg_y_coords = [msg_start_y + i * step_y for i in range(total_messages)]
    
    # mxGraph cells
    mx_cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    svg_elems = []
    
    # Header bar
    svg_elems.append(f'<rect x="20" y="15" width="{diagram_w - 40}" height="32" rx="4" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>')
    svg_elems.append(f'<text x="35" y="36" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#0369a1">{escape_xml(title)}</text>')
    svg_elems.append(f'<text x="{diagram_w - 35}" y="36" font-family="Segoe UI, sans-serif" font-size="11" fill="#64748b" text-anchor="end">Slide Ch6 p.22-26 Standard (Sommerville)</text>')
    
    p_centers = []
    for i, p in enumerate(participants):
        cx = start_x + i * spacing + (header_w // 2)
        p_centers.append(cx)
        px = cx - (header_w // 2)
        p_name = p['name']
        p_type = p.get('type', 'service')
        fill_c = p.get('fill', '#dbeafe')
        stroke_c = p.get('stroke', '#3b82f6')
        text_c = p.get('text_c', '#1e40af')
        
        if p_type == 'actor':
            # Actor Stickman
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor={fill_c};strokeColor={stroke_c};" vertex="1" parent="1">'
                f'<mxGeometry x="{cx - 15}" y="{top_y}" width="30" height="55" as="geometry"/>'
                f'</mxCell>'
            )
            # Lifeline
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1.5;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 65}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 35}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # SVG Actor Stickman
            svg_elems.append(f'<circle cx="{cx}" cy="{top_y + 10}" r="9" fill="{fill_c}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 19}" x2="{cx}" y2="{top_y + 40}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx - 12}" y1="{top_y + 26}" x2="{cx + 12}" y2="{top_y + 26}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 40}" x2="{cx - 9}" y2="{top_y + 55}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 40}" x2="{cx + 9}" y2="{top_y + 55}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<text x="{cx}" y="{top_y + 72}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="{stroke_c}" text-anchor="middle">{escape_xml(p_name)}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 80}" x2="{cx}" y2="{diagram_h - 35}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')
            
        else:
            # Participant Box
            mx_cells.append(
                f'<mxCell id="p_{i}" value="{escape_xml(p_name)}" style="rounded=1;whiteSpace=wrap;html=1;fontFamily=Segoe UI;fontSize=12;fontStyle=1;fillColor={fill_c};strokeColor={stroke_c};strokeWidth=2;fontColor={text_c};" vertex="1" parent="1">'
                f'<mxGeometry x="{px}" y="{top_y + 15}" width="{header_w}" height="{header_h}" as="geometry"/>'
                f'</mxCell>'
            )
            # Lifeline
            mx_cells.append(
                f'<mxCell id="line_{i}" value="" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#94a3b8;strokeWidth=1.5;html=1;endArrow=none;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{cx}" y="{top_y + 15 + header_h}" as="sourcePoint"/>'
                f'<mxPoint x="{cx}" y="{diagram_h - 35}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # SVG Participant Box
            svg_elems.append(f'<rect x="{px}" y="{top_y + 15}" width="{header_w}" height="{header_h}" rx="5" fill="{fill_c}" stroke="{stroke_c}" stroke-width="2"/>')
            svg_elems.append(f'<text x="{cx}" y="{top_y + 43}" font-family="Segoe UI" font-size="12" font-weight="bold" fill="{text_c}" text-anchor="middle">{escape_xml(p_name)}</text>')
            svg_elems.append(f'<line x1="{cx}" y1="{top_y + 15 + header_h}" x2="{cx}" y2="{diagram_h - 35}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>')

    # Continuous Activation Bars
    act_w = 12
    act_cell_id = 100
    for p_idx, ranges in active_ranges.items():
        cx = p_centers[p_idx]
        p = participants[p_idx]
        fill_c = p.get('fill', '#dbeafe')
        stroke_c = p.get('stroke', '#3b82f6')
        
        for (start_m, end_m) in ranges:
            act_y1 = msg_y_coords[start_m] - 5
            act_y2 = msg_y_coords[end_m] + 15
            act_h = max(24, act_y2 - act_y1)
            
            # mxGraph activation cell
            mx_cells.append(
                f'<mxCell id="act_{act_cell_id}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor={fill_c};strokeColor={stroke_c};strokeWidth=1.5;" vertex="1" parent="1">'
                f'<mxGeometry x="{cx - act_w // 2}" y="{act_y1}" width="{act_w}" height="{act_h}" as="geometry"/>'
                f'</mxCell>'
            )
            act_cell_id += 1
            
            # SVG visual activation bar
            svg_elems.append(
                f'<rect x="{cx - act_w // 2}" y="{act_y1}" width="{act_w}" height="{act_h}" rx="1" fill="{fill_c}" stroke="{stroke_c}" stroke-width="1.5"/>'
            )

    # Message Arrows & Labels
    for m_idx, m in enumerate(messages):
        src = m['src']
        dst = m['dst']
        text = m['text']
        is_resp = m.get('is_resp', False)
        is_self = m.get('is_self', False)
        time_mark = m.get('time_mark', None)
        
        y = msg_y_coords[m_idx]
        x_src = p_centers[src]
        x_dst = p_centers[dst]
        
        if is_self:
            # Self-call loop (Slide 40 Validate())
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(text)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#1e293b;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0f172a;endArrow=block;endFill=1;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x_src + act_w // 2}" y="{y - 8}" as="sourcePoint"/>'
                f'<mxPoint x="{x_src + act_w // 2}" y="{y + 14}" as="targetPoint"/>'
                f'<Array as="points">'
                f'<mxPoint x="{x_src + 35}" y="{y - 8}"/>'
                f'<mxPoint x="{x_src + 35}" y="{y + 14}"/>'
                f'</Array>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            svg_elems.append(f'<path d="M {x_src + act_w // 2} {y - 8} L {x_src + 35} {y - 8} L {x_src + 35} {y + 14} L {x_src + act_w // 2 + 4} {y + 14}" fill="none" stroke="#1e293b" stroke-width="1.5"/>')
            svg_elems.append(f'<polygon points="{x_src + act_w // 2},{y+14} {x_src + act_w // 2 + 7},{y+10} {x_src + act_w // 2 + 7},{y+18}" fill="#1e293b"/>')
            svg_elems.append(f'<text x="{x_src + 42}" y="{y + 5}" font-family="Segoe UI" font-size="11" font-weight="600" fill="#0f172a">{escape_xml(text)}</text>')
            
        elif not is_resp:
            # Solid Call Message (Request)
            x1 = x_src + (act_w // 2 if x_dst > x_src else -act_w // 2)
            x2 = x_dst + (-act_w // 2 if x_dst > x_src else act_w // 2)
            mid_x = (x1 + x2) // 2
            
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(text)}" style="html=1;verticalAlign=bottom;endArrow=block;endFill=1;dashed=0;strokeColor=#1e293b;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#0f172a;fontStyle=1;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x1}" y="{y}" as="sourcePoint"/>'
                f'<mxPoint x="{x2}" y="{y}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # Solid line
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" stroke="#1e293b" stroke-width="1.5"/>')
            # Solid Arrow Head
            if x2 > x1:
                svg_elems.append(f'<polygon points="{x2},{y} {x2-8},{y-4} {x2-8},{y+4}" fill="#1e293b"/>')
            else:
                svg_elems.append(f'<polygon points="{x2},{y} {x2+8},{y-4} {x2+8},{y+4}" fill="#1e293b"/>')
            
            # Badge background for label
            label_len = len(text) * 6.6
            svg_elems.append(f'<rect x="{mid_x - label_len//2}" y="{y - 17}" width="{label_len}" height="14" fill="#ffffff" fill-opacity="0.95"/>')
            svg_elems.append(f'<text x="{mid_x}" y="{y - 6}" font-family="Segoe UI" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">{escape_xml(text)}</text>')
            
        else:
            # Dashed Return Message (Response)
            x1 = x_src + (act_w // 2 if x_dst > x_src else -act_w // 2)
            x2 = x_dst + (-act_w // 2 if x_dst > x_src else act_w // 2)
            mid_x = (x1 + x2) // 2
            
            mx_cells.append(
                f'<mxCell id="msg_{m_idx}" value="{escape_xml(text)}" style="html=1;verticalAlign=bottom;endArrow=open;dashed=1;strokeColor=#2563eb;strokeWidth=1.5;fontFamily=Segoe UI;fontSize=11;fontColor=#1e40af;fontStyle=2;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry">'
                f'<mxPoint x="{x1}" y="{y}" as="sourcePoint"/>'
                f'<mxPoint x="{x2}" y="{y}" as="targetPoint"/>'
                f'</mxGeometry>'
                f'</mxCell>'
            )
            # Dashed line
            svg_elems.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" stroke="#2563eb" stroke-dasharray="5 4" stroke-width="1.5"/>')
            # Open Arrow Head
            if x2 > x1:
                svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2-7}" y2="{y-4}" stroke="#2563eb" stroke-width="1.5"/>')
                svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2-7}" y2="{y+4}" stroke="#2563eb" stroke-width="1.5"/>')
            else:
                svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2+7}" y2="{y-4}" stroke="#2563eb" stroke-width="1.5"/>')
                svg_elems.append(f'<line x1="{x2}" y1="{y}" x2="{x2+7}" y2="{y+4}" stroke="#2563eb" stroke-width="1.5"/>')
            
            # Badge background for label
            label_len = len(text) * 6.6
            svg_elems.append(f'<rect x="{mid_x - label_len//2}" y="{y - 17}" width="{label_len}" height="14" fill="#ffffff" fill-opacity="0.95"/>')
            svg_elems.append(f'<text x="{mid_x}" y="{y - 6}" font-family="Segoe UI" font-size="11" font-style="italic" fill="#1e40af" text-anchor="middle">{escape_xml(text)}</text>')
            
        # Time Mark if present (e.g. {a} or {b})
        if time_mark:
            tx = p_centers[0] - 22
            svg_elems.append(f'<text x="{tx}" y="{y + 4}" font-family="Segoe UI" font-size="11" font-weight="bold" fill="#dc2626">{time_mark}</text>')

    # Duration Constraint (Slide 22/23 Feature: {b - a < X sec})
    if duration_constraint:
        p_idx = duration_constraint.get('p_idx', 0)
        s_idx = duration_constraint['start_msg_idx']
        e_idx = duration_constraint['end_msg_idx']
        d_label = duration_constraint['label']
        
        y_a = msg_y_coords[s_idx]
        y_b = msg_y_coords[e_idx]
        dim_x = p_centers[p_idx] - 38
        
        # Dimension line with double-headed arrow
        svg_elems.append(f'<line x1="{dim_x}" y1="{y_a}" x2="{dim_x}" y2="{y_b}" stroke="#dc2626" stroke-dasharray="3 3" stroke-width="1.5"/>')
        # Arrowhead at top
        svg_elems.append(f'<polygon points="{dim_x},{y_a} {dim_x-3},{y_a+6} {dim_x+3},{y_a+6}" fill="#dc2626"/>')
        # Arrowhead at bottom
        svg_elems.append(f'<polygon points="{dim_x},{y_b} {dim_x-3},{y_b-6} {dim_x+3},{y_b-6}" fill="#dc2626"/>')
        
        # Text label badge
        mid_dim_y = (y_a + y_b) // 2
        lbl_w = len(d_label) * 6.5
        svg_elems.append(f'<rect x="{dim_x - lbl_w - 6}" y="{mid_dim_y - 8}" width="{lbl_w}" height="16" fill="#ffffff" fill-opacity="0.95" stroke="#fca5a5" stroke-width="1" rx="3"/>')
        svg_elems.append(f'<text x="{dim_x - 10}" y="{mid_dim_y + 4}" font-family="Segoe UI" font-size="10" font-weight="bold" fill="#dc2626" text-anchor="end">{escape_xml(d_label)}</text>')
        
        # Guide dashed lines from lifeline to dimension line
        svg_elems.append(f'<line x1="{dim_x}" y1="{y_a}" x2="{p_centers[p_idx] - act_w//2}" y2="{y_a}" stroke="#dc2626" stroke-dasharray="2 2" stroke-width="1"/>')
        svg_elems.append(f'<line x1="{dim_x}" y1="{y_b}" x2="{p_centers[p_idx] - act_w//2}" y2="{y_b}" stroke="#dc2626" stroke-dasharray="2 2" stroke-width="1"/>')

    # Build XML & SVG
    mxgraph_xml = (
        '<mxfile host="Electron" modified="2026-10-28T10:00:00.000Z" agent="Antigravity UML Designer" version="21.6.8" type="device">'
        '<diagram id="diagram_1" name="Page-1">'
        f'<mxGraphModel dx="{diagram_w}" dy="{diagram_h}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{diagram_w}" pageHeight="{diagram_h}" math="0" shadow="0">'
        '<root>'
        + "".join(mx_cells) +
        '</root>'
        '</mxGraphModel>'
        '</diagram>'
        '</mxfile>'
    )
    content_escaped = escape_xml(mxgraph_xml)
    
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="{diagram_w}px" height="{diagram_h}px" viewBox="-0.5 -0.5 {diagram_w} {diagram_h}" content="{content_escaped}">',
        f'<defs/>',
        f'<g>',
        f'<rect x="0" y="0" width="{diagram_w}" height="{diagram_h}" fill="#ffffff" stroke="none"/>',
        "".join(svg_elems),
        f'</g>',
        f'</svg>'
    ]
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("".join(svg))
    print(f"Created: {filepath}")

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
    for d in DIAGRAMS:
        create_slide_sequence_diagram(
            filepath=d["filepath"],
            title=d["title"],
            participants=d["participants"],
            messages=d["messages"],
            active_ranges=d["active_ranges"],
            duration_constraint=d.get("duration_constraint")
        )
    print("All 7 Sequence Diagrams regenerated with slide style!")
