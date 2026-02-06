import urllib.request
import shutil
shutil.os.makedirs("input", exist_ok=True)
urllib.request.urlretrieve("https://raw.githubusercontent.com/data-prep-kit/data-prep-kit/dev/transforms/language/docling2parquet/test-data/input/archive1.zip", "input/archive1.zip")
urllib.request.urlretrieve("https://raw.githubusercontent.com/data-prep-kit/data-prep-kit/dev/transforms/language/docling2parquet/test-data/input/redp5110-ch1.pdf", "input/redp5110-ch1.pdf")
