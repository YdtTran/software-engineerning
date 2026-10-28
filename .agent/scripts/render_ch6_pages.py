import pymupdf
import os

doc = pymupdf.open("00_Slides/06_Ch6 System Modeling_2025.pdf")
os.makedirs(".agent/scratch/ch6_images", exist_ok=True)

pages_to_render = [11, 13, 17, 18, 19, 20, 22, 23, 24, 25, 26, 30, 31, 32, 33, 34, 39, 40, 42, 43, 49, 50, 51, 52]

for p in pages_to_render:
    page = doc[p-1] # 0-indexed
    pix = page.get_pixmap(dpi=150)
    out_path = f".agent/scratch/ch6_images/page_{p}.png"
    pix.save(out_path)
    print(f"Saved {out_path}")
