import pymupdf

doc = pymupdf.open("00_Slides/03_Ch3_4 Requirements Engineering.pdf")

for p in range(52, 57):
    page = doc[p]
    print(f"=== PAGE {p+1} ===")
    print(page.get_text())
