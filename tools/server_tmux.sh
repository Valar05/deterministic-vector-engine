#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SESSION_NAME=dve-wonder-server
PORT=${DVE_WONDER_PORT:-8811}
MARKER=empty-glass-shovel-finish-v3

if ! command -v tmux >/dev/null 2>&1; then
  echo 'ERROR: tmux is required for the durable server lane.' >&2
  exit 1
fi
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=$(command -v python3)
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=$(command -v python)
else
  echo 'ERROR: python is required for the compiler server.' >&2
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  SESSION_ROOT=$(tmux display-message -p -t "$SESSION_NAME" '#{pane_current_path}')
  if [ "$SESSION_ROOT" != "$PROJECT_ROOT" ] || ! curl -fs --max-time 2 "http://127.0.0.1:$PORT/api/noodle/health" | grep -q "$MARKER"; then
    tmux kill-session -t "$SESSION_NAME"
  fi
fi
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT" \
    "$PYTHON_BIN tools/noodle_server.py --host 127.0.0.1 --port $PORT"
  echo "Started server session: $SESSION_NAME"
else
  echo "Server session already healthy: $SESSION_NAME"
fi

attempt=0
while [ "$attempt" -lt 30 ]; do
  if curl -fs --max-time 2 "http://127.0.0.1:$PORT/api/noodle/health" | grep -q "$MARKER"; then
    echo "Server ready: http://127.0.0.1:$PORT/"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 0.1
done

echo "ERROR: compiler server did not become ready: http://127.0.0.1:$PORT/" >&2
exit 1
