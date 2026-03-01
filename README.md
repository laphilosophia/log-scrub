# Log Scrub

A CLI utility that sanitizes and beautifies JSON logs from stdin.
Automatically redacts sensitive data like passwords, tokens, and API keys while providing colorful, readable output.

## Features

- **Sensitive Data Redaction** - Automatically masks passwords, tokens, secrets, and other sensitive fields
- **Syntax Highlighting** - Color-coded JSON output for better readability
- **Stream Processing** - Processes logs in real-time via stdin
- **Customizable** - Configure which keys to redact and replacement text
- **Regex Support** - Use regex patterns for advanced matching
- **Config File Support** - Load settings from .logscrubrc
- **Multiple Input Formats** - Support for JSON and logfmt formats
- **Statistics** - Track processing statistics

## Installation

```bash
npm install -g @laphilosophia/log-scrub
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

```bash
-k, --keys <list>        Comma separated keys to redact
                         (use /regex/ for regex patterns, file:path for external file)
                         (default: password,token,secret,key,auth,credit_card,cvv,authorization)
-r, --replacement <text> Replacement text (default: "***** [REDACTED] *****")
-c, --compact            Compact JSON output (no pretty print)
-d, --dry-run            Show output without redaction
-s, --stats              Show processing statistics
-rm, --remove            Remove sensitive fields completely instead of masking
-f, --format <type>      Input format: json, logfmt (default: json)
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

# Dry run (no redaction)
echo '{"password":"secret"}' | scrub -d

# Show statistics
echo '{"password":"secret"}' | scrub -s

# Remove sensitive fields completely
echo '{"name":"John","password":"secret"}' | scrub --remove

# Use regex pattern
echo '{"api_key_123":"secret"}' | scrub -k "/api_key/"

# Use external key file
echo '{"mysecret":"value"}' | scrub -k file:keys.txt

# Process logfmt input
echo 'level=info message="test" password=secret' | scrub -f logfmt

# Config file
# Create .logscrubrc in current directory or home:
# {
#   "keys": "password,token,custom_key",
#   "replacement": "[REDACTED]",
#   "compact": false
# }
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
