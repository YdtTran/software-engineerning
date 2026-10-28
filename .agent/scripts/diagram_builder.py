import os
import html

def escape_xml(s):
    return html.escape(s, quote=True)

def build_drawio_svg(filepath, width, height, system_title, actor_left, actor_right, usecases, edges):
    """
    Builds a clean, non-overlapping .drawio.svg diagram.
    - System boundary has a light ocean blue background (fillColor=#e0f2fe, strokeColor=#0284c7).
    - System boundary is calculated dynamically with generous padding (>= 60px) around all use cases,
      ensuring no use case can ever protrude or be sliced by the boundary line.
    - pointerEvents=0 on sys_boundary allows clicking through to inner usecases.
    - Associations snap to exact outer edges (entryX=0/1, entryY=0.5) so lines never cross other ellipses.
    - <<include>> and <<extend>> relations use dedicated edgeLabel cells with html=0 and labelBackgroundColor=#e0f2fe.
    """
    # 1. Calculate dynamic bounding box of all use cases
    min_uc_x = min(uc['x'] for uc in usecases)
    max_uc_x = max(uc['x'] + uc['w'] for uc in usecases)
    min_uc_y = min(uc['y'] for uc in usecases)
    max_uc_y = max(uc['y'] + uc['h'] for uc in usecases)

    pad_left = 60
    pad_right = 60
    pad_top = 55
    pad_bottom = 50

    sys_x = min_uc_x - pad_left
    sys_y = min_uc_y - pad_top
    sys_w = (max_uc_x + pad_right) - sys_x
    sys_h = (max_uc_y + pad_bottom) - sys_y

    # Calculate Actor positions
    act_left_w, act_left_h = 40, 80
    act_left_x = sys_x - 100 if actor_left else 0
    act_left_y = sys_y + (sys_h // 2) - 40

    act_right_w, act_right_h = 40, 80
    act_right_x = sys_x + sys_w + 50 if actor_right else 0
    act_right_y = sys_y + (sys_h // 2) - 40

    # Dynamic canvas dimensions
    min_canvas_w = (act_right_x + act_right_w + 40) if actor_right else (sys_x + sys_w + 40)
    canvas_w = max(width, min_canvas_w)
    canvas_h = max(height, sys_y + sys_h + 40)

    # If actor_left exists, make sure min_x >= 20
    if actor_left and act_left_x < 20:
        offset_x = 20 - act_left_x
        sys_x += offset_x
        act_left_x += offset_x
        if actor_right:
            act_right_x += offset_x
        for uc in usecases:
            uc['x'] += offset_x
        canvas_w += offset_x

    # 2. Build mxGraphModel
    mx_cells = []
    mx_cells.append('<mxCell id="0"/>')
    mx_cells.append('<mxCell id="1" parent="0"/>')

    # System Boundary (fillColor=#e0f2fe: Light Ocean Blue, pointerEvents=0)
    mx_cells.append(
        f'<mxCell id="sys_boundary" value="{system_title}" '
        f'style="shape=rect;whiteSpace=wrap;html=1;verticalAlign=top;fontStyle=1;fontSize=15;'
        f'fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;spacingTop=12;fontColor=#0f172a;pointerEvents=0;" '
        f'vertex="1" parent="1">'
        f'<mxGeometry x="{sys_x}" y="{sys_y}" width="{sys_w}" height="{sys_h}" as="geometry"/>'
        f'</mxCell>'
    )

    # Actor Left
    if actor_left:
        mx_cells.append(
            f'<mxCell id="actor_left" value="{actor_left}" '
            f'style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;'
            f'fillColor=#bae6fd;strokeColor=#0284c7;strokeWidth=1.8;fontSize=13;fontStyle=1;fontColor=#0f172a;" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{act_left_x}" y="{act_left_y}" width="{act_left_w}" height="{act_left_h}" as="geometry"/>'
            f'</mxCell>'
        )

    # Actor Right
    if actor_right:
        mx_cells.append(
            f'<mxCell id="actor_right" value="{actor_right}" '
            f'style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;'
            f'fillColor=#bae6fd;strokeColor=#0284c7;strokeWidth=1.8;fontSize=13;fontStyle=1;fontColor=#0f172a;" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{act_right_x}" y="{act_right_y}" width="{act_right_w}" height="{act_right_h}" as="geometry"/>'
            f'</mxCell>'
        )

    # Use Cases
    for uc in usecases:
        f_style = f"fillColor={uc.get('fill', '#ffffff')};strokeColor={uc.get('stroke', '#0284c7')};strokeWidth=1.6;fontSize=12;fontColor=#0f172a;"
        if uc.get('is_bold'):
            f_style += "fontStyle=1;"
        uc_text = uc['text'].replace('\n', '&#xa;')
        mx_cells.append(
            f'<mxCell id="{uc["id"]}" value="{uc_text}" '
            f'style="ellipse;whiteSpace=wrap;html=1;{f_style}" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{uc["x"]}" y="{uc["y"]}" width="{uc["w"]}" height="{uc["h"]}" as="geometry"/>'
            f'</mxCell>'
        )

    # Edges
    for idx, e in enumerate(edges):
        eid = e['id']
        etype = e.get('type', 'assoc')
        src = e['source']
        tgt = e['target']
        lbl = e.get('label', '')

        if etype == 'assoc':
            edge_style = "endArrow=none;html=1;rounded=0;strokeColor=#0284c7;strokeWidth=1.6;"
            if src == "actor_left":
                edge_style += "exitX=1;exitY=0.33;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
            elif tgt == "actor_right":
                edge_style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.33;entryDx=0;entryDy=0;"
            elif tgt == "actor_left":
                edge_style += "exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.33;entryDx=0;entryDy=0;"
            
            mx_cells.append(
                f'<mxCell id="{eid}" value="" style="{edge_style}" edge="1" parent="1" source="{src}" target="{tgt}">'
                f'<mxGeometry relative="1" as="geometry"/>'
                f'</mxCell>'
            )
        elif etype in ('include', 'extend'):
            mx_cells.append(
                f'<mxCell id="{eid}" value="" '
                f'style="endArrow=open;dashed=1;html=1;rounded=0;strokeColor=#0284c7;strokeWidth=1.5;endSize=8;" '
                f'edge="1" parent="1" source="{src}" target="{tgt}">'
                f'<mxGeometry relative="1" as="geometry"/>'
                f'</mxCell>'
            )
            if lbl:
                safe_lbl = escape_xml(lbl)
                mx_cells.append(
                    f'<mxCell id="{eid}_lbl" value="{safe_lbl}" '
                    f'style="edgeLabel;html=0;align=center;verticalAlign=middle;resizable=0;points=[];'
                    f'fontSize=11;fontColor=#0369a1;fontStyle=1;labelBackgroundColor=#e0f2fe;" '
                    f'vertex="1" connectable="0" parent="{eid}">'
                    f'<mxGeometry relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry>'
                    f'</mxCell>'
                )
        elif etype == 'generalization':
            mx_cells.append(
                f'<mxCell id="{eid}" value="" '
                f'style="endArrow=block;endFill=0;endSize=10;html=1;rounded=0;strokeColor=#0284c7;strokeWidth=1.6;" '
                f'edge="1" parent="1" source="{src}" target="{tgt}">'
                f'<mxGeometry relative="1" as="geometry"/>'
                f'</mxCell>'
            )

    mxfile_xml = (
        f'<mxfile host="Electron"><diagram id="Page-1" name="Page-1">'
        f'<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" '
        f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{canvas_w}" pageHeight="{canvas_h}" '
        f'math="0" shadow="0"><root>{"".join(mx_cells)}</root></mxGraphModel></diagram></mxfile>'
    )
    content_escaped = escape_xml(mxfile_xml)

    # 3. Build SVG Body
    svg_elements = []
    svg_elements.append(f'  <rect x="0" y="0" width="{canvas_w}" height="{canvas_h}" fill="#ffffff"/>')
    # Layer 0: System Boundary with light ocean blue fill (#e0f2fe)
    svg_elements.append(f'  <rect x="{sys_x}" y="{sys_y}" width="{sys_w}" height="{sys_h}" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>')
    svg_elements.append(f'  <text x="{sys_x + sys_w//2}" y="{sys_y + 30}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">{system_title}</text>')

    # Actors Render
    def render_actor(name, cx, cy):
        return f'''  <g>
    <circle cx="{cx}" cy="{cy}" r="14" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
    <line x1="{cx}" y1="{cy+14}" x2="{cx}" y2="{cy+45}" stroke="#0284c7" stroke-width="2"/>
    <line x1="{cx-20}" y1="{cy+25}" x2="{cx+20}" y2="{cy+25}" stroke="#0284c7" stroke-width="2"/>
    <line x1="{cx}" y1="{cy+45}" x2="{cx-18}" y2="{cy+70}" stroke="#0284c7" stroke-width="2"/>
    <line x1="{cx}" y1="{cy+45}" x2="{cx+18}" y2="{cy+70}" stroke="#0284c7" stroke-width="2"/>
    <text x="{cx}" y="{cy+95}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">{name}</text>
  </g>'''

    uc_map = {uc['id']: uc for uc in usecases}
    actor_coords = {}
    if actor_left:
        actor_coords['actor_left'] = (act_left_x + 20, act_left_y + 15)
        svg_elements.append(render_actor(actor_left, act_left_x + 20, act_left_y + 15))
    if actor_right:
        actor_coords['actor_right'] = (act_right_x + 20, act_right_y + 15)
        svg_elements.append(render_actor(actor_right, act_right_x + 20, act_right_y + 15))

    # Edges Render
    for e in edges:
        src_id = e['source']
        tgt_id = e['target']
        etype = e.get('type', 'assoc')
        lbl = e.get('label', '')

        if src_id == 'actor_left' and tgt_id in uc_map:
            x1 = actor_coords['actor_left'][0] + 20
            y1 = actor_coords['actor_left'][1] + 25
            x2 = uc_map[tgt_id]['x']
            y2 = uc_map[tgt_id]['y'] + uc_map[tgt_id]['h'] / 2.0
        elif tgt_id == 'actor_right' and src_id in uc_map:
            x1 = uc_map[src_id]['x'] + uc_map[src_id]['w']
            y1 = uc_map[src_id]['y'] + uc_map[src_id]['h'] / 2.0
            x2 = actor_coords['actor_right'][0] - 20
            y2 = actor_coords['actor_right'][1] + 25
        elif tgt_id == 'actor_left' and src_id in uc_map:
            x1 = uc_map[src_id]['x']
            y1 = uc_map[src_id]['y'] + uc_map[src_id]['h'] / 2.0
            x2 = actor_coords['actor_left'][0] + 20
            y2 = actor_coords['actor_left'][1] + 25
        else:
            uc_s = uc_map[src_id]
            uc_t = uc_map[tgt_id]
            sx, sy = uc_s['x'] + uc_s['w']/2.0, uc_s['y'] + uc_s['h']/2.0
            tx, ty = uc_t['x'] + uc_t['w']/2.0, uc_t['y'] + uc_t['h']/2.0
            dx, dy = tx - sx, ty - sy
            dist = (dx**2 + dy**2)**0.5 or 1
            ux, uy = dx/dist, dy/dist

            x1 = sx + ux * (uc_s['w']/2.0 - 2)
            y1 = sy + uy * (uc_s['h']/2.0 - 2)
            x2 = tx - ux * (uc_t['w']/2.0 - 2)
            y2 = ty - uy * (uc_t['h']/2.0 - 2)

        if etype == 'assoc':
            svg_elements.append(f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#0284c7" stroke-width="1.6"/>')
        elif etype in ('include', 'extend'):
            svg_elements.append(f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="5,4" marker-end="url(#arrowOpenBlue)"/>')
            if lbl:
                mx = (x1 + x2)/2.0
                my = (y1 + y2)/2.0
                safe_l = escape_xml(lbl)
                svg_elements.append(f'''  <g transform="translate({mx-44:.1f}, {my-11:.1f})">
    <rect x="0" y="0" width="88" height="22" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" rx="4"/>
    <text x="44" y="15" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="bold" fill="#0369a1">{safe_l}</text>
  </g>''')
        elif etype == 'generalization':
            svg_elements.append(f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#0284c7" stroke-width="1.6" marker-end="url(#arrowWhiteTriangle)"/>')

    # Use Cases Render
    for uc in usecases:
        cx = uc['x'] + uc['w']/2.0
        cy = uc['y'] + uc['h']/2.0
        rx = uc['w']/2.0
        ry = uc['h']/2.0
        fill = uc.get('fill', '#ffffff')
        stroke = uc.get('stroke', '#0284c7')
        sw = 2 if uc.get('is_bold') else 1.5
        svg_elements.append(f'  <ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
        
        lines = uc['text'].split('\n')
        fw = 'bold' if uc.get('is_bold') else 'normal'
        fs = 12
        if len(lines) == 1:
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy+4:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="{fs}" font-weight="{fw}" fill="#0f172a">{lines[0]}</text>')
        elif len(lines) == 2:
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy-3:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="{fs}" font-weight="{fw}" fill="#0f172a">{lines[0]}</text>')
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy+14:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="{fs}" font-weight="{fw}" fill="#0f172a">{lines[1]}</text>')
        elif len(lines) >= 3:
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy-11:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="{fw}" fill="#0f172a">{lines[0]}</text>')
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy+4:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="{fw}" fill="#0f172a">{lines[1]}</text>')
            svg_elements.append(f'  <text x="{cx:.1f}" y="{cy+19:.1f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="{fw}" fill="#0f172a">{lines[2]}</text>')

    full_svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="{canvas_w}px" height="{canvas_h}px" viewBox="-0.5 -0.5 {canvas_w} {canvas_h}" content="{content_escaped}">
  <defs>
    <marker id="arrowOpenBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#0284c7" stroke-width="1.8"/>
    </marker>
    <marker id="arrowWhiteTriangle" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <polygon points="0 1, 11 6, 0 11" fill="#ffffff" stroke="#0284c7" stroke-width="1.6"/>
    </marker>
  </defs>
{chr(10).join(svg_elements)}
</svg>
'''
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(full_svg)
    print(f"Created: {filepath} (Size: {canvas_w}x{canvas_h}, Boundary: x={sys_x}, y={sys_y}, w={sys_w}, h={sys_h})")
