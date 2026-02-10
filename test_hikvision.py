"""
Test script v3 - Sends XML body for user search since DS-K1A8503MF-B
prefers XML for that endpoint. Saves results to /app/test_results.json
READ-ONLY only.
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

def safe_get(url, retries=3):
    for attempt in range(retries):
        try:
            return requests.get(url, auth=auth, timeout=TIMEOUT)
        except Exception as e:
            print(f"  Intento {attempt+1}/{retries} falló: {type(e).__name__}: {e}")
            if attempt < retries - 1:
                time.sleep(3)
            else:
                raise

def safe_post(url, retries=3, **kwargs):
    for attempt in range(retries):
        try:
            return requests.post(url, auth=auth, timeout=TIMEOUT, **kwargs)
        except Exception as e:
            print(f"  Intento {attempt+1}/{retries} falló: {type(e).__name__}: {e}")
            if attempt < retries - 1:
                time.sleep(3)
            else:
                raise

# TEST 1: Device Info
print("Test 1: Device Info...")
try:
    r = safe_get(f'{base}/ISAPI/System/deviceInfo')
    results['device_info'] = {'status': r.status_code, 'raw': r.text}
    print(f"  OK - Status {r.status_code}")
except Exception as e:
    results['device_info'] = {'error': str(e)}
    print(f"  FAIL - {e}")

time.sleep(2)

# TEST 2: Events (last 7 days, first 5)
print("Test 2: Events (last 7 days)...")
try:
    end = datetime.now()
    start = end - timedelta(days=7)
    payload = {
        "AcsEventCond": {
            "searchID": "test_read",
            "searchResultPosition": 0,
            "maxResults": 5,
            "major": 0,
            "minor": 0,
            "startTime": start.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
            "endTime": end.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
        }
    }
    r = safe_post(f'{base}/ISAPI/AccessControl/AcsEvent?format=json', json=payload)
    data = r.json()
    total = data.get('AcsEvent', {}).get('totalMatches', 0)
    events = data.get('AcsEvent', {}).get('InfoList', [])
    
    # Collect unique attendance statuses
    all_statuses = set()
    if total > 0:
        # Get more events to see different statuses
        payload2 = dict(payload)
        payload2['AcsEventCond'] = dict(payload['AcsEventCond'])
        payload2['AcsEventCond']['maxResults'] = min(total, 100)
        payload2['AcsEventCond']['searchID'] = 'test_all_statuses'
        time.sleep(1)
        r2 = safe_post(f'{base}/ISAPI/AccessControl/AcsEvent?format=json', json=payload2)
        all_events = r2.json().get('AcsEvent', {}).get('InfoList', [])
        for ev in all_events:
            all_statuses.add(ev.get('attendanceStatus', 'N/A'))
    
    results['events'] = {
        'status': r.status_code,
        'total_matches': total,
        'sample_events': events,
        'event_keys': list(events[0].keys()) if events else [],
        'unique_attendance_statuses': list(all_statuses),
    }
    print(f"  OK - {total} total events")
    print(f"  Attendance statuses found: {all_statuses}")
except Exception as e:
    results['events'] = {'error': str(e)}
    print(f"  FAIL - {e}")

time.sleep(2)

# TEST 3: Users (try XML body)
print("Test 3: Users...")
try:
    xml_body = """<?xml version="1.0" encoding="UTF-8"?>
<UserInfoSearchCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<searchID>test_users</searchID>
<searchResultPosition>0</searchResultPosition>
<maxResults>10</maxResults>
</UserInfoSearchCond>"""
    
    r = safe_post(
        f'{base}/ISAPI/AccessControl/UserInfo/Search?format=json',
        data=xml_body,
        headers={'Content-Type': 'application/xml'}
    )
    
    content_type = r.headers.get('Content-Type', '')
    results['users'] = {
        'status': r.status_code,
        'content_type': content_type,
        'raw_response': r.text[:3000],
    }
    
    if 'json' in content_type:
        data = r.json()
        user_data = data.get('UserInfoSearch', {})
        results['users']['total'] = user_data.get('totalMatches', 0)
        results['users']['sample_users'] = user_data.get('UserInfo', [])[:5]
    
    print(f"  OK - Status {r.status_code} ({content_type})")
except Exception as e:
    results['users'] = {'error': str(e)}
    print(f"  FAIL - {e}")

time.sleep(1)

# TEST 3b: Users (try JSON body as fallback)
print("Test 3b: Users (JSON body)...")
try:
    payload = {
        "UserInfoSearchCond": {
            "searchID": "test_users_json",
            "searchResultPosition": 0,
            "maxResults": 10,
        }
    }
    r = safe_post(
        f'{base}/ISAPI/AccessControl/UserInfo/Search?format=json',
        json=payload
    )
    content_type = r.headers.get('Content-Type', '')
    results['users_json'] = {
        'status': r.status_code,
        'content_type': content_type,
        'raw_response': r.text[:3000],
    }
    print(f"  OK - Status {r.status_code} ({content_type})")
except Exception as e:
    results['users_json'] = {'error': str(e)}
    print(f"  FAIL - {e}")

# Save results
with open('/app/test_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False, default=str)

print("\nDone! Results saved to /app/test_results.json")
