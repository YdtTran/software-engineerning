import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

# 1. Update PROJECT_SPECIFICATION.md
update_file(
    "PROJECT_SPECIFICATION.md",
    [
        ("file:///c:/Users/Triet/Documents/03_Year3/02_SE/01_Usecase_diagram/", "./01_Diagram/01_Usecase_Diagram/"),
        ("01_Usecase_diagram/", "01_Diagram/01_Usecase_Diagram/"),
        ("01_Usecase_diagram", "01_Diagram/01_Usecase_Diagram")
    ]
)

# 2. Update SUBMISSION_1_REPORT.md
update_file(
    "SUBMISSION_1_REPORT.md",
    [
        ("./01_Usecase_diagram/", "./01_Diagram/01_Usecase_Diagram/"),
        ("01_Usecase_diagram/", "01_Diagram/01_Usecase_Diagram/"),
        ("01_Usecase_diagram", "01_Diagram/01_Usecase_Diagram")
    ]
)
print("Finished updating documentation paths.")
