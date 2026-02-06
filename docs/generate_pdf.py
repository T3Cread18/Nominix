import markdown
import os
import subprocess
import time

# Paths
BASE_DIR = r"c:\Desarrollo\RRHH\docs"
MD_FILE = os.path.join(BASE_DIR, "NOMINIX_DOCUMENTO_FUNCIONAL_MAESTRO.md")
HTML_FILE = os.path.join(BASE_DIR, "temp_doc.html")
PDF_FILE = os.path.join(BASE_DIR, "NOMINIX_DOCUMENTO_FUNCIONAL_MAESTRO.pdf")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 1. Read Markdown
print(f"Reading {MD_FILE}...")
with open(MD_FILE, "r", encoding="utf-8") as f:
    md_content = f.read()

# 2. Convert to HTML
print("Converting to HTML...")
html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])

# 3. Create full HTML with Mermaid and CSS
# We need to transform ```mermaid ... ``` blocks into <div class="mermaid"> ... </div>
# The fenced_code extension usually makes <pre><code class="language-mermaid"> ... </code></pre>
# We replace that.
html_body = html_body.replace('<pre><code class="language-mermaid">', '<div class="mermaid">')
html_body = html_body.replace('</code></pre>', '</div>')

html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>NOMINIX Documentación</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        body {{
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
        }}
        
        h1 {{ 
            color: #1a365d; 
            border-bottom: 3px solid #e2e8f0; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
        }}
        
        h2 {{ 
            color: #2c5282; 
            margin-top: 40px; 
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
        }}
        
        h3 {{ color: #2b6cb0; margin-top: 25px; }}
        
        table {{ 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0; 
            font-size: 0.9em;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}
        
        th, td {{ 
            border: 1px solid #e2e8f0; 
            padding: 12px; 
            text-align: left; 
        }}
        
        th {{ 
            background-color: #f7fafc; 
            font-weight: 700;
            color: #2d3748;
        }}
        
        tr:nth-child(even) {{ background-color: #fbfdff; }}
        
        blockquote {{ 
            border-left: 5px solid #41A9DA; 
            background-color: #f0f9ff;
            margin: 20px 0; 
            padding: 15px 20px; 
            font-style: italic;
            color: #2c5282;
            border-radius: 0 4px 4px 0;
        }}
        
        code {{
            background-color: #edf2f7;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }}
        
        div.mermaid {{
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
        }}
        
        .page-break {{ page-break-before: always; }}
    </style>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ 
            startOnLoad: true, 
            theme: 'base',
            themeVariables: {{
                primaryColor: '#ebf8ff',
                edgeLabelBackground: '#ffffff',
                tertiaryColor: '#f0fff4'
            }}
        }});
    </script>
</head>
<body>
    {html_body}
</body>
</html>
"""

print(f"Writing {HTML_FILE}...")
with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(html_content)

# 4. Convert to PDF using Edge Headless
print("Generating PDF...")
cmd = [
    EDGE_PATH,
    '--headless',
    '--no-pdf-header-footer',
    '--print-to-pdf=' + PDF_FILE,
    HTML_FILE
]

# We assume Edge takes a few seconds to render content (including Mermaid)
# But headless mode is tricky. Often it prints immediately.
# Let's hope Mermaid renders fast enough or Edge smart-waits.
try:
    subprocess.run(cmd, check=True)
    print(f"PDF generated successfully at: {PDF_FILE}")
except Exception as e:
    print(f"Error generating PDF: {e}")
