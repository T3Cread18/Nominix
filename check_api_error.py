import requests
try:
    # No Host header (or Host: localhost)
    r = requests.get('http://localhost:8000/api/employees/')
    print(f"Status: {r.status_code}")
    if r.status_code == 500:
        print("Backend Error (500) detected on public schema.")
        # Check if we can see the error in the response (if DEBUG=True)
        if 'ProgrammingError' in r.text or 'does not exist' in r.text.lower():
            print("Confirmed: Tables not found in public schema.")
except Exception as e:
    print(f"Error: {e}")
