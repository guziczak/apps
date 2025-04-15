import base64
import pyperclip
import sys

def encode_to_base64():
    try:
        # Pobierz tekst ze schowka
        text = pyperclip.paste()
        
        if not text:
            return 1

        # Kodowanie tekstu do Base64 (z obsługą UTF-8)
        base64_bytes = base64.b64encode(text.encode('utf-8'))
        base64_text = base64_bytes.decode('utf-8')
        
        # Zapisz zakodowany tekst z powrotem do schowka
        pyperclip.copy(base64_text)
        
        return 0

    except Exception as e:
        return 1

if __name__ == "__main__":
    sys.exit(encode_to_base64())