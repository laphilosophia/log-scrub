# log-scrub

A CLI utility that sanitizes and beautifies JSON logs from stdin. Automatically redacts sensitive data like passwords, tokens, and API keys while providing colorful, readable output.

## Features

- 🔒 **Sensitive Data Redaction** - Automatically masks passwords, tokens, secrets, and other sensitive fields
- 🎨 **Syntax Highlighting** - Color-coded JSON output for better readability
- ⚡ **Stream Processing** - Processes logs in real-time via stdin
- 🔧 **Customizable** - Configure which keys to redact and replacement text

## Installation

```bash
npm install -g log-scrub
```

## Usage

Pipe any JSON logs through `scrub`:

```bash
# Basic usage
cat app.log | scrub

# Docker logs
docker logs my-container | scrub

# Tail and scrub
tail -f /var/log/app.log | scrub
```

### Options

```
-k, --keys <list>        Comma separated keys to redact
                         (default: password,token,secret,key,auth,credit_card,cvv,authorization)
-r, --replacement <text> Replacement text (default: "***** [REDACTED] *****")
-c, --compact            Compact JSON output (no pretty print)
-V, --version            Output version number
-h, --help               Display help
```

### Examples

```bash
# Custom keys to redact
echo '{"username":"john","ssn":"123-45-6789"}' | scrub -k ssn,dob

# Custom replacement text
echo '{"password":"secret123"}' | scrub -r "[HIDDEN]"

# Compact output
echo '{"name":"John","token":"abc123"}' | scrub -c
```

## Output

Before:
```json
{"user":"john","password":"secret123","token":"abc-xyz"}
```

After:
```json
{
  "user": "john",
  "password": "***** [REDACTED] *****",
  "token": "***** [REDACTED] *****"
}
```

## License

MIT
