with open('style.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('    white-space: pre;`r`n    overflow-x: auto;', '    white-space: pre;\r\n    overflow-x: auto;')

with open('style.css', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Fixed!")
