with open('full_traceback.txt', 'rb') as f:
    content = f.read()
    try:
        text = content.decode('utf-16le')
    except:
        text = content.decode('utf-8', errors='ignore')
    print(text)
