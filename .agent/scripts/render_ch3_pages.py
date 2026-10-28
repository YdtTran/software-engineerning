import fitz # PyMuPDF
import os

doc = fitz.open("00_Slides/03_Ch3_4 Requirements Engineering.pdf")
os.makedirs(".agent/scratch/ch3_images", exist_ok=True)

for p_num in [52, 53, 54, 55, 56, 57]: # 0-indexed: 52 is page 53
    page = doc[p_num]
    pix = page.get_pixmap(dpi=150)
    out_path = f".agent/scratch/ch3_images/page_{p_num+1}.png"
    pix.save(out_path)
    print(f"Saved {out_path}")
