import pypdf

def dump_slides(pdf_path, filter_words=None):
    reader = pypdf.PdfReader(pdf_path)
    print(f"\n========================================================")
    print(f"DUMPING {pdf_path} (Total pages: {len(reader.pages)})")
    print(f"========================================================")
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if filter_words:
            if any(w.lower() in text.lower() for w in filter_words):
                print(f"--- Page {idx+1} ---")
                print(text)
        else:
            print(f"--- Page {idx+1} ---")
            print(text)

dump_slides("00_Slides/03_Ch3_4 Requirements Engineering.pdf", ["use case", "use-case", "scenario", "actor", "system boundary", "functional", "non-functional", "tabular", "template"])
