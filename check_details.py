import inspect
from payroll_core.engine import PayrollEngine

def run():
    source = inspect.getsource(PayrollEngine._get_contract_concepts)
    for line in source.split('\n'):
        if "'code':" in line:
            print(f"In-Memory Line: {line.strip()}")

if __name__ == '__main__':
    run()
