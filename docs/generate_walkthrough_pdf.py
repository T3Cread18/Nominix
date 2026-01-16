"""
Script para generar PDF del análisis del sistema Nominix.
Usa markdown + HTML + CSS para crear un PDF profesional.
"""
import markdown
from pathlib import Path

# Rutas
WALKTHROUGH_PATH = Path(r"C:\Users\Ing Pablo\.gemini\antigravity\brain\ec25e3b5-43fd-479e-a5d4-47e84bb8f816\walkthrough.md")
OUTPUT_HTML = Path(r"C:\Desarrollo\RRHH\analisis_nominix.html")
OUTPUT_PDF = Path(r"C:\Desarrollo\RRHH\analisis_nominix.pdf")

# Leer el contenido del markdown
md_content = WALKTHROUGH_PATH.read_text(encoding='utf-8')

# Configurar extensiones de markdown
extensions = [
    'markdown.extensions.tables',
    'markdown.extensions.fenced_code',
    'markdown.extensions.codehilite',
    'markdown.extensions.toc',
]

# Convertir a HTML
html_body = markdown.markdown(md_content, extensions=extensions)

# CSS para estilo profesional
css = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
        box-sizing: border-box;
    }
    
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        max-width: 900px;
        margin: 0 auto;
        padding: 40px;
        background: #ffffff;
    }
    
    h1 {
        color: #111827;
        border-bottom: 3px solid #6366f1;
        padding-bottom: 10px;
        font-size: 2em;
    }
    
    h2 {
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
        margin-top: 40px;
    }
    
    h3 {
        color: #4b5563;
        margin-top: 30px;
    }
    
    h4 {
        color: #6b7280;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 0.9em;
    }
    
    th, td {
        border: 1px solid #e5e7eb;
        padding: 12px;
        text-align: left;
    }
    
    th {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        font-weight: 600;
    }
    
    tr:nth-child(even) {
        background-color: #f9fafb;
    }
    
    tr:hover {
        background-color: #f3f4f6;
    }
    
    code {
        background-color: #f3f4f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
        color: #6366f1;
    }
    
    pre {
        background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        color: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 0.85em;
    }
    
    pre code {
        background: none;
        color: #f9fafb;
        padding: 0;
    }
    
    blockquote {
        border-left: 4px solid #6366f1;
        margin: 20px 0;
        padding: 10px 20px;
        background-color: #eef2ff;
        border-radius: 0 8px 8px 0;
    }
    
    a {
        color: #6366f1;
        text-decoration: none;
    }
    
    a:hover {
        text-decoration: underline;
    }
    
    hr {
        border: none;
        border-top: 2px solid #e5e7eb;
        margin: 40px 0;
    }
    
    /* Badges */
    .emoji {
        font-size: 1.2em;
    }
    
    /* Print styles */
    @media print {
        body {
            padding: 20px;
        }
        
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        table {
            page-break-inside: avoid;
        }
    }
</style>
"""

# HTML completo
html_complete = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis Completo del Sistema Nominix</title>
    {css}
</head>
<body>
    {html_body}
    
    <hr>
    <footer style="text-align: center; color: #9ca3af; font-size: 0.85em; margin-top: 40px;">
        <p>Generado automáticamente el 16 de Enero, 2026</p>
        <p>© Nominix - Sistema de Gestión de Nómina</p>
    </footer>
</body>
</html>
"""

# Guardar HTML
OUTPUT_HTML.write_text(html_complete, encoding='utf-8')
print(f"✅ HTML generado: {OUTPUT_HTML}")
print(f"")
print(f"📄 Para ver el documento, abre el archivo HTML en tu navegador.")
print(f"💡 Desde el navegador puedes imprimirlo como PDF (Ctrl+P -> Guardar como PDF)")
print(f"")
print(f"📁 Ubicación: {OUTPUT_HTML}")
