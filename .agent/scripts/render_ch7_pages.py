import pymupdf
import os

doc = pymupdf.open("00_Slides/07_Ch7 Architectural Design_2025.pdf")
os.makedirs(".agent/scratch/ch7_images", exist_ok=True)

for p in [8, 17, 18, 42]:
    page = doc[p-1]
    pix = page.get_pixmap(dpi=150)
    out_path = f".agent/scratch/ch7_images/page_{p}.png"
    pix.save(out_path)
    print(f"Saved {out_path}")
