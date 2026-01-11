import openpyxl
import os

file_path = 'Copia de NOMINA PARA PABLO.xlsx'
output_file = 'analysis_output.txt'

if not os.path.exists(file_path):
    with open(output_file, 'w') as f:
        f.write("File not found.")
    exit(1)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(f"--- ANALYZING: {file_path} ---\n")
    wb = openpyxl.load_workbook(file_path, data_only=False)

    for sheet_name in wb.sheetnames:
        f.write(f"\n>>> SHEET: {sheet_name}\n")
        ws = wb[sheet_name]
        
        header_row_idx = -1
        header_map = {}
        
        # scan for header
        for i, row in enumerate(ws.iter_rows(max_row=20, values_only=True)):
            row_str = " ".join([str(c).upper() for c in row if c is not None])
            if "NOMBRE" in row_str and "CEDULA" in row_str:
                header_row_idx = i + 1
                f.write(f"FOUND HEADER AT ROW {header_row_idx}\n")
                
                # Map headers
                for col_idx, cell_val in enumerate(row):
                    if cell_val:
                        header_map[col_idx + 1] = str(cell_val).strip()
                        f.write(f"  Col {col_idx+1}: {cell_val}\n")
                break
        
        if header_row_idx != -1:
            f.write("\n--- DATA SAMPLE (Row + 1) ---\n")
            # Analyze just the first data row
            r = header_row_idx + 1
            for col in range(1, ws.max_column + 1):
                cell = ws.cell(row=r, column=col)
                val = cell.value
                
                if val is None: continue

                header_name = header_map.get(col, f"Col {col}")
                
                if isinstance(val, str) and val.strip().startswith('='):
                   f.write(f"  [{header_name}] FORMULA: {val}\n")
                else:
                   f.write(f"  [{header_name}] VALUE: {val}\n")
        else:
            f.write("Header not found, dumping raw first 5 rows:\n")
            for i, row in enumerate(ws.iter_rows(max_row=5, values_only=True)):
                f.write(f"Row {i+1}: {row}\n")

print("Analysis written to file.")
