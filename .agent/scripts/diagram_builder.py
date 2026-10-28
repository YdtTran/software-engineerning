"""Build native use-case diagrams; render exports with render_usecases.cjs."""
import importlib.util
import math
import os
from pathlib import Path
import xml.etree.ElementTree as ET

DIAGRAMS = []
BLUE = "#0284c7"
BACKGROUND = "#e0f2fe"


def escape_xml(s):
    import html
    return html.escape(s, quote=True)


def build_drawio_svg(filepath, width, height, system_title, actor_left, actor_right, usecases, edges):
    # Reflow the existing semantic model instead of trusting its legacy coordinates.
    nodes = {u["id"]: dict(u, w=280, h=80) for u in usecases}
    overview = "uc_base" not in nodes
    actors = {"actor_left": actor_left}
    if overview:
        actors["actor_right"] = actor_right
        skill = Path(os.environ.get("DRAWIO_SKILL", Path.home() / ".agents/skills/drawio-skill"))
        spec = importlib.util.spec_from_file_location("drawio_autolayout", skill / "scripts/autolayout.py")
        layout = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(layout)
        graph = {"direction": "LR", "nodes": [{"id": k, "width": 280, "height": 100} for k in nodes] +
                 [{"id": k, "width": 40, "height": 80} for k in actors],
                 "edges": [{"source": "actor_left" if k.startswith("uc_s") else "actor_right", "target": k} for k in nodes]}
        _, positions, _ = layout.layout(layout.build_dot(graph))
        ordered = sorted(nodes, key=lambda k: -positions[k][1])
        for i, k in enumerate(ordered):
            nodes[k].update(x=520, y=100 + i * 110)
        actor_positions = {}
        for actor, prefix in [("actor_left", "uc_s"), ("actor_right", "uc_o")]:
            ys = [n["y"] + 40 for k, n in nodes.items() if k.startswith(prefix)]
            actor_positions[actor] = (70, (min(ys) + max(ys)) / 2 - 80 * .33)
        edges = [dict(e, source="actor_right", target=e["source"]) if e["target"] == "actor_right" else dict(e) for e in edges]
    else:
        satellites = [k for k in nodes if k not in ("uc_base", "uc_cancel", "uc_validate")]
        for i, k in enumerate(satellites):
            nodes[k].update(x=980, y=100 + i * 140)
        base_h = max(100, 24 * len(satellites))
        center_y = 140 + max(0, len(satellites) - 1) * 70
        nodes["uc_base"].update(x=340, y=center_y - base_h / 2, h=base_h)
        if "uc_validate" in nodes:
            children = [nodes[k] for k in ("uc_child3", "uc_child4")]
            nodes["uc_validate"].update(x=1640, y=sum(n["y"] for n in children) / 2)
        if "uc_cancel" in nodes:
            nodes["uc_cancel"].update(x=340, y=max(n["y"] + n["h"] for k, n in nodes.items() if k != "uc_cancel") + 100)
        actor_y = center_y
        if "uc_cancel" in nodes:
            actor_y = (center_y + nodes["uc_cancel"]["y"] + 40) / 2
        actor_positions = {"actor_left": (70, actor_y - 80 * .33)}

    x = min(n["x"] for n in nodes.values()) - 60
    y = min(n["y"] for n in nodes.values()) - 55
    w = max(n["x"] + n["w"] for n in nodes.values()) + 60 - x
    h = max(n["y"] + n["h"] for n in nodes.values()) + 50 - y
    width, height = math.ceil(x + w + 30), math.ceil(y + h + 30)
    mxfile = ET.Element("mxfile", host="drawio", agent="drawio-skill", version="26.0.0")
    page = ET.SubElement(mxfile, "diagram", id=Path(filepath).stem, name=Path(filepath).name.split(".")[0])
    model = ET.SubElement(page, "mxGraphModel", grid="1", gridSize="10", page="0", pageWidth=str(width), pageHeight=str(height), background="#ffffff")
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")

    def vertex(cid, text, style, xx, yy, ww, hh, parent="1"):
        cell = ET.SubElement(root, "mxCell", id=cid, value=text, style=style, vertex="1", parent=parent)
        ET.SubElement(cell, "mxGeometry", x=str(xx), y=str(yy), width=str(ww), height=str(hh), **{"as": "geometry"})
        return cell

    vertex("sys_boundary", system_title, "rounded=0;container=1;collapsible=0;whiteSpace=wrap;html=0;verticalAlign=top;spacingTop=12;fontFamily=Arial;fontSize=18;fontStyle=1;fontColor=#0f172a;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;pointerEvents=0;", x, y, w, h)
    for k, n in nodes.items():
        fill = "#bae6fd" if n.get("is_bold") else "#ffffff"
        vertex(k, n["text"], f"ellipse;whiteSpace=wrap;html=0;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=15;fontColor=#0f172a;fontStyle={int(bool(n.get('is_bold')))};fillColor={fill};strokeColor={BLUE};strokeWidth=1.6;", n["x"]-x, n["y"]-y, n["w"], n["h"], "sys_boundary")
    for k, name in actors.items():
        ax, ay = actor_positions[k]
        vertex(k, name, "shape=umlActor;html=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;outlineConnect=0;fontFamily=Arial;fontSize=16;fontStyle=1;fontColor=#0f172a;fillColor=#bae6fd;strokeColor=#0284c7;strokeWidth=1.6;", ax, ay, 40, 80)

    def arc(index, count, side):
        angle = 0 if count == 1 else math.radians(-65 + 130 * index / (count - 1))
        return ((1 + side * math.cos(angle)) / 2, (1 + math.sin(angle)) / 2)

    related = [e for e in edges if e["type"] != "assoc" and "uc_base" in (e["source"], e["target"])]
    related.sort(key=lambda e: nodes[e["target"] if e["source"] == "uc_base" else e["source"]]["y"])
    for e in edges:
        source, target, kind = e["source"], e["target"], e["type"]
        start, end = (1, .5), (0, .5)
        if kind == "assoc":
            start = (1, .33)
        elif e in related:
            port = arc(related.index(e), len(related), 1)
            if source == "uc_base":
                start = port
            else:
                start, end = (0, .5), port
        elif target == "uc_validate":
            end = arc(0 if source == "uc_child3" else 1, 2, -1)
        style = f"edgeStyle=none;noEdgeStyle=1;rounded=0;html=0;strokeColor={BLUE};strokeWidth=1.6;exitX={start[0]};exitY={start[1]};entryX={end[0]};entryY={end[1]};exitPerimeter=0;entryPerimeter=0;exitDx=0;exitDy=0;entryDx=0;entryDy=0;"
        style += {"assoc": "endArrow=none;", "include": "dashed=1;dashPattern=6 4;endArrow=open;endSize=10;endFill=0;", "extend": "dashed=1;dashPattern=6 4;endArrow=open;endSize=10;endFill=0;", "generalization": "endArrow=block;endSize=14;endFill=0;fillColor=#e0f2fe;"}[kind]
        edge = ET.SubElement(root, "mxCell", id=e["id"], value="", style=style, edge="1", parent="1", source=source, target=target)
        ET.SubElement(edge, "mxGeometry", relative="1", **{"as": "geometry"})
        if kind in ("include", "extend"):
            label = vertex(e["id"] + "_lbl", "<<"+kind+">>", "edgeLabel;html=0;align=center;verticalAlign=middle;resizable=0;points=[];fontFamily=Arial;fontSize=13;fontColor=#0369a1;fontStyle=1;labelBackgroundColor=#e0f2fe;", 0, 0, 0, 0, e["id"])
            geo = label.find("mxGeometry")
            # Labels sit near the satellite, where fan routes have ample separation.
            geo.attrib.clear()
            geo.attrib.update(x="0.35" if source == "uc_base" or target == "uc_validate" else "-0.35", y="0", relative="1", **{"as": "geometry"})
            ET.SubElement(geo, "mxPoint", x="0", y="-16", **{"as": "offset"})
    output = Path(filepath.replace(".drawio.svg", ".drawio"))
    output.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(mxfile)
    ET.ElementTree(mxfile).write(output, encoding="utf-8", xml_declaration=True)
    DIAGRAMS.append(dict(path=output, nodes=nodes, actors=actors, edges=edges, title=system_title))
    print(f"Created {output.name}: {len(nodes)} use cases, {len(edges)} relationships")


def write_catalog(base_dir):
    lines = ["# Use-case diagrams: PlantUML and Mermaid", "", "Source: original PNGs in `refs/uc_uml/USE_CASE/`. Native Draw.io files and editable SVG exports use checked, separate edge routes. Mermaid is a flowchart approximation of UML notation; Draw.io is the layout reference.", ""]
    for d in DIAGRAMS:
        name = d["path"].stem
        lines += [f"## {name}", "", f"[Editable Draw.io]({d['path'].relative_to(base_dir).as_posix()}) | [SVG preview]({d['path'].relative_to(base_dir).as_posix()}.svg)", "", "```plantuml", "@startuml", "left to right direction", "skinparam shadowing false", "skinparam rectangleBackgroundColor #e0f2fe", "skinparam rectangleBorderColor #0284c7"]
        for k, actor in d["actors"].items():
            lines.append(f'actor "{actor}" as {k}')
        lines.append('rectangle "Smart E-Mobility Hub System" {')
        for k, n in d["nodes"].items():
            text = n["text"].replace("\n", " ")
            lines.append(f'  usecase "{text}" as {k}')
        lines.append("}")
        for e in d["edges"]:
            arrow = {"assoc": "--", "include": "..>", "extend": "..>", "generalization": "--|>"}[e["type"]]
            direction = "-right-" if e["type"] == "assoc" else arrow
            label = " : <<" + e["type"] + ">>" if e["type"] in ("include", "extend") else ""
            lines.append(f"{e['source']} {direction} {e['target']}{label}")
        lines += ["@enduml", "```", "", "```mermaid", "flowchart LR"]
        for k, actor in d["actors"].items():
            lines.append(f'  {k}["{actor}"]')
        lines.append('  subgraph sys_boundary["Smart E-Mobility Hub System"]')
        for k, n in d["nodes"].items():
            text = n["text"].replace("\n", "<br/>").replace("&", "&amp;")
            lines.append(f'    {k}(["{text}"])')
        lines.append("  end")
        for e in d["edges"]:
            arrow = {"assoc": "---", "include": '-. "&lt;&lt;include&gt;&gt;" .->', "extend": '-. "&lt;&lt;extend&gt;&gt;" .->', "generalization": '-->|"generalization: child to parent"|'}[e["type"]]
            lines.append(f"  {e['source']} {arrow} {e['target']}")
        lines += ["  style sys_boundary fill:#e0f2fe,stroke:#0284c7,stroke-width:2px", "```", ""]
    Path(base_dir, "PLANTUML_ALL.md").write_text("\n".join(lines), encoding="utf-8")
