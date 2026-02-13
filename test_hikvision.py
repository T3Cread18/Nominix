"""
Test script v4 - Debugging Mode
- Checks lock status first.
- Prioritizes JSON over XML (XML suspects of causing Auth Lock).
- Adds Capability checks.
- Saves results to /app/test_results.json
"""
import json
import time
import requests
from datetime import datetime, timedelta
from requests.auth import HTTPDigestAuth

auth = HTTPDigestAuth('admin', 'GFO2025..')
base = 'http://201.221.114.242:8001'
TIMEOUT = 30
results = {}

def safe_get(url, retries=2):
    for attempt in range(retries):
        try:
            return requests.get(url, auth=auth, timeout=TIMEOUT)
        except Exception as e:
            print(f"  Intento {attempt+1}/{retries} falló: {type(e).__name__}: {e}")
            if attempt < retries - 1: time.sleep(2)
            else: raise

def safe_post(url, retries=2, **kwargs):
    for attempt in range(retries):
        try:
            return requests.post(url, auth=auth, timeout=TIMEOUT, **kwargs)
        except Exception as e:
            print(f"  Intento {attempt+1}/{retries} falló: {type(e).__name__}: {e}")
            if attempt < retries - 1: time.sleep(2)
            else: raise

print("--- HIKVISION DEBUG SCRIPT V4 ---")

# 1. Device Info & Lock Check
print("\n[1] Checking Device Status...")
try:
    r = safe_get(f'{base}/ISAPI/System/deviceInfo')
    results['device_info'] = {'status': r.status_code, 'raw': r.text}
    
    if r.status_code == 401 and '<lockStatus>lock</lockStatus>' in r.text:
        print("!! CRITICAL: DEVICE IS LOCKED !!")
        if '<unlockTime>' in r.text:
            t = r.text.split('<unlockTime>')[1].split('</unlockTime>')[0]
            print(f"   Time remaining: {t} seconds")
        print("   Aborting tests to prevent further lockout extension.")
        exit(1)
        
    print(f"   OK - Status {r.status_code}")
except Exception as e:
    print(f"   FAIL - {e}")
    results['device_info'] = {'error': str(e)}

# 2. Events (Known working)
print("\n[2] Checking Events (JSON)...")
try:
    end = datetime.now()
    start = end - timedelta(days=2) # Shorter range
    payload = {
        "AcsEventCond": {
            "searchID": "test_debug",
            "searchResultPosition": 0,
            "maxResults": 5,
            "major": 0,
            "minor": 0,
            "startTime": start.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
            "endTime": end.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
        }
    }
    r = safe_post(f'{base}/ISAPI/AccessControl/AcsEvent?format=json', json=payload)
    results['events'] = {'status': r.status_code}
    if r.status_code == 200:
        total = r.json().get('AcsEvent', {}).get('totalMatches', 0)
        print(f"   OK - {total} matches found")
    else:
        print(f"   FAIL - Status {r.status_code}")
except Exception as e:
    print(f"   FAIL - {e}")

# 3. User Capabilities (New)
print("\n[3] Checking User Capabilities...")
try:
    r = safe_get(f'{base}/ISAPI/AccessControl/UserInfo/capabilities?format=json')
    results['user_caps'] = {'status': r.status_code, 'text': r.text[:500]}
    
    if r.status_code == 200:
        print("   OK - Capabilities received")
        print(f"   Raw: {r.text[:200]}...")
    else:
        print(f"   FAIL - Status {r.status_code}")
except Exception as e:
    print(f"   FAIL - {e}")

# 4. User Count (New - Simpler than search)
print("\n[4] Checking User Count...")
try:
    r = safe_get(f'{base}/ISAPI/AccessControl/UserInfo/count?format=json')
    results['user_count'] = {'status': r.status_code, 'text': r.text[:200]}
    
    if r.status_code == 200:
        print(f"   OK - {r.text}")
    else:
        print(f"   FAIL - Status {r.status_code}")
except Exception as e:
    print(f"   FAIL - {e}")

# 5. User Search (JSON) - Modified Payload
print("\n[5] Search Users (JSON)...")
try:
    # Minimal payload
    payload = {
        "UserInfoSearchCond": {
            "searchID": "test_users_v4",
            "maxResults": 10,
            "searchResultPosition": 0
        }
    }
    r = safe_post(f'{base}/ISAPI/AccessControl/UserInfo/Search?format=json', json=payload)
    results['user_search_json'] = {'status': r.status_code, 'text': r.text[:500]}
    
    if r.status_code == 200:
        print("   OK - Users retrieved!")
        data = r.json()
        users = data.get('UserInfoSearch', {}).get('UserInfo', [])
        print(f"   Found {len(users)} users in sample")
    else:
        print(f"   FAIL - Status {r.status_code}")
        print(f"   Response: {r.text[:200]}")
        
except Exception as e:
    print(f"   FAIL - {e}")

# 6. Skip XML test to avoid lockout
print("\n[6] Skipped XML test (Risk of lockout)")

# Save
with open('test_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("\nDone. Check test_results.json")
