import html
import os
import xml.etree.ElementTree as ET

def create_drawio_svg(filename, width, height, mxfile_xml, svg_body):
    # Escape mxfile for content attribute
    # Need to replace " with &quot; and < with &lt; and > with &gt; and & with &amp;
    content_escaped = html.escape(mxfile_xml, quote=True)
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="{width}px" height="{height}px" viewBox="-0.5 -0.5 {width} {height}" content="{content_escaped}">
  <defs>
    <marker id="arrowOpenBlue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#0284c7" stroke-width="1.8"/>
    </marker>
    <marker id="arrowWhiteTriangle" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <polygon points="0 1, 11 6, 0 11" fill="#ffffff" stroke="#0284c7" stroke-width="1.6"/>
    </marker>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>
{svg_body}
</svg>
'''
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Generated: {filename}")

print("Script template ready.")
