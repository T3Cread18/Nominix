
import os
import django
from django.urls import get_resolver

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

def list_urls(lis, acc=None):
    if acc is None:
        acc = []
    if not lis:
        return
    for entry in lis:
        if hasattr(entry, 'url_patterns'):
            list_urls(entry.url_patterns, acc + [str(entry.pattern)])
        else:
            print(''.join(acc) + str(entry.pattern))

print("Listing all URL patterns:")
list_urls(get_resolver().url_patterns)
