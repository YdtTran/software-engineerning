import pymupdf
import glob
import os

pdf_files = sorted(glob.glob("00_Slides/*.pdf"))
for pdf_path in pdf_files:
    fname = os.path.basename(pdf_path)
    if fname in ["06_Ch6 System Modeling_2025.pdf", "03_Ch3_4 Requirements Engineering.pdf"]:
        continue
    doc = pymupdf.open(pdf_path)
    print(f"\n=== {fname} ({len(doc)} pages) ===")
    for p_idx, page in enumerate(doc):
        text = page.get_text()
        for kw in ["diagram", "uml", "use case", "activity", "sequence", "class", "state", "architecture view", "4+1"]:
            if kw in text.lower():
                first_line = text.split("\n")[0] if text else ""
                print(f"  p.{p_idx+1}: {first_line.strip()} (matches '{kw}')")
                break
