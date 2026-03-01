import json
import random
import string
import uuid
from datetime import datetime, timedelta

OUTPUT_FILE = "dataset.json"
TARGET_SIZE = 1024 * 1024 * 1024 * 5  # 5GB

def rand_str(n=32):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

def rand_token(prefix="tok", n=40):
    return f"{prefix}_{rand_str(n)}"

def rand_credit_card():
    return ''.join(random.choices(string.digits, k=16))

def rand_cvv():
    return ''.join(random.choices(string.digits, k=3))

def rand_date():
    start = datetime(2020, 1, 1)
    delta = timedelta(seconds=random.randint(0, 5 * 365 * 24 * 3600))
    return (start + delta).isoformat() + "Z"

def generate_record():
    return {
        "user_id": f"usr_{uuid.uuid4().hex[:12]}",
        "email": f"user{random.randint(1, 10_000_000)}@example.com",
        "profile": {
            "username": f"user{random.randint(1, 10_000_000)}",
            "password": rand_token("pwd", 50),
            "created_at": rand_date()
        },
        "auth": {
            "token": rand_token("jwt", 80),
            "secret": rand_token("sec", 40),
            "api_key": rand_token("sk", 40),
            "authorization": f"Bearer {rand_token('auth', 60)}"
        },
        "payment": {
            "credit_card": {
                "number": rand_credit_card(),
                "cvv": rand_cvv(),
                "expiry": f"{random.randint(1,12):02d}/{random.randint(25,35)}"
            }
        },
        "session": {
            "session_id": rand_token("sess", 40),
            "device_token": rand_token("dev", 40)
        },
        "metadata": {
            "internal_key": rand_token("key", 40),
            "service_token": rand_token("srv", 40)
        }
    }

with open(OUTPUT_FILE, "w", buffering=1024*1024) as f:
    f.write("[\n")
    size = 0
    first = True

    while size < TARGET_SIZE:
        record = generate_record()
        line = json.dumps(record)

        if not first:
            f.write(",\n")
        first = False

        f.write(line)
        size += len(line)

        if size % (100 * 1024 * 1024) < 1000:
            print(f"{size / (1024*1024):.2f} MB written")

    f.write("\n]")
