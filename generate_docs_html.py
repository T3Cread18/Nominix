import os
import re
import base64
import glob

# Configuration
DOCS_DIR = r"c:\Desarrollo\RRHH\docs\process_flows"
ARTIFACTS_DIR = r"C:\Users\Ing Pablo\.gemini\antigravity\brain\1aa61d63-b1f4-45f3-a1f8-e0cd0b920515"
OUTPUT_FILE = r"c:\Desarrollo\RRHH\docs\Nominix_System_Documentation.html"

# Order of files to include
FILES_ORDER = [
    "vacation_process_flow.md",
    "payroll_flow.md",
    "contracts_flow.md",
    "loans_flow.md",
    "settlements_flow.md",
    "tenant_creation_flow.md"
]

# CSS Styles
CSS = """
<style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px; }
    h1 { color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 40px; page-break-before: always; }
    h1:first-child { page-break-before: auto; margin-top: 0; }
    h2 { color: #2c3e50; margin-top: 30px; border-bottom: 1px solid #eee; }
    h3 { color: #555; margin-top: 20px; }
    img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin: 20px 0; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 0.9em; }
    pre { background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #eee; }
    ul { padding-left: 20px; }
    li { margin-bottom: 5px; }
    .mermaid { display: none; } /* Hide mermaid code blocks in static print */
    @media print {
        body { padding: 0; max-width: 100%; }
        h1 { page-break-before: always; }
        h1:first-child { page-break-before: auto; }
        .no-print { display: none; }
    }
</style>
"""

def get_image_base64(image_name):
    """Finds image in artifacts dir (fuzzy match) and returns base64 src"""
    # Try exact match first
    path = os.path.join(ARTIFACTS_DIR, image_name)
    if not os.path.exists(path):
        # fuzzy match for timestamped files: e.g. contracts_hiring_flow.png -> contracts_hiring_flow_12345.png
        base_name = os.path.splitext(image_name)[0]
        pattern = os.path.join(ARTIFACTS_DIR, f"{base_name}*.png")
        matches = glob.glob(pattern)
        if matches:
            path = matches[0] # Take first match
        else:
            print(f"Warning: Image not found: {image_name}")
            return ""
            
    with open(path, "rb") as img_file:
        b64 = base64.b64encode(img_file.read()).decode('utf-8')
        return f"data:image/png;base64,{b64}"

def markdown_to_html(text):
    """Simple regex-based markdown to HTML converter"""
    html = text
    
    # Headers
    html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    
    # Images: ![alt](path)
    def replace_img(match):
        alt = match.group(1)
        path = match.group(2)
        filename = os.path.basename(path)
        # Strip generic file:/// prefix stuff if present
        if "%20" in filename: filename = filename.replace("%20", " ")
        
        src = get_image_base64(filename)
        if src:
            return f'<div style="text-align:center"><img src="{src}" alt="{alt}"></div>'
        return f'<p><em>[Image not found: {filename}]</em></p>'
        
    html = re.sub(r'!\[(.*?)\]\((.*?)\)', replace_img, html)
    
    # Bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    
    # Code Blocks (basic)
    html = re.sub(r'```(.*?)```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)
    
    # Lists (basic - only working for single level bullet points)
    lines = html.split('\n')
    new_lines = []
    in_list = False
    for line in lines:
        if line.strip().startswith('* ') or line.strip().startswith('- '):
            if not in_list:
                new_lines.append('<ul>')
                in_list = True
            content = line.strip()[2:]
            new_lines.append(f'<li>{content}</li>')
        else:
            if in_list:
                new_lines.append('</ul>')
                in_list = False
            new_lines.append(line)
    if in_list: new_lines.append('</ul>')
    html = '\n'.join(new_lines)
    
    # Paragraphs (simple: empty lines separate paragraphs)
    # This is a bit hacky, but works for simple docs
    paragraphs = html.split('\n\n')
    formatted_paragraphs = []
    for p in paragraphs:
        if not p.strip().startswith('<') and p.strip():
            # If line doesn't start with tag, wrap in p
            formatted_paragraphs.append(f'<p>{p.replace("\n", "<br>")}</p>')
        else:
            formatted_paragraphs.append(p)
            
    return '\n'.join(formatted_paragraphs)

def main():
    content = []
    content.append("<html><head><title>Documentación del Sistema Nóminix</title>")
    content.append(CSS)
    content.append("</head><body>")
    
    # Title Page
    content.append("""
    <div style="text-align:center; padding-top: 200px; page-break-after: always;">
        <h1 style="border:none; color:#2c3e50; font-size: 3em;">Nóminix</h1>
        <h2 style="border:none; color:#7f8c8d;">Documentación Técnica & Flujogramas</h2>
        <p style="margin-top:50px; color:#95a5a6;">Generado Automáticamente</p>
    </div>
    """)
    
    for filename in FILES_ORDER:
        path = os.path.join(DOCS_DIR, filename)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                md_content = f.read()
                html_content = markdown_to_html(md_content)
                content.append(f'<div class="section">')
                content.append(html_content)
                content.append('</div>')
                print(f"Processed {filename}")
        else:
            print(f"Skipping {filename} (not found)")
            
    content.append("</body></html>")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write('\n'.join(content))
        
    print(f"Successfully created: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
