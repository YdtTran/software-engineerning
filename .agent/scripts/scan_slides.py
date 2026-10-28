import pypdf
import os
import glob

slides_dir = "00_Slides"
pdf_files = sorted(glob.glob(os.path.join(slides_dir, "*.pdf")))

print(f"Found {len(pdf_files)} PDF files in {slides_dir}:")
for pdf_path in pdf_files:
    filename = os.path.basename(pdf_path)
    reader = pypdf.PdfReader(pdf_path)
    print(f"\n========================================================")
    print(f"FILE: {filename} (Pages: {len(reader.pages)})")
    print(f"========================================================")
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        # print first 2 lines
        header = " | ".join(lines[:2]) if lines else "EMPTY"
        if any(keyword in text.lower() for keyword in ["use case", "use-case", "scenario", "sequence", "activity", "class diagram", "state", "architecture", "pattern", "include", "extend", "generalization", "boundary", "actor"]):
            print(f"  Page {idx+1}: {header}  ==> [MATCH KEYWORDS]")
        else:
            print(f"  Page {idx+1}: {header}")
