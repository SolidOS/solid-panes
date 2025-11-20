#!/bin/bash

echo "export default {"
date -u '+buildTime: "%Y-%m-%dT%H:%M:%SZ",'
if [ -d .git ]; then
  git log | grep commit | head -1 | sed -e 's/ /: "/' | sed -e 's/$/",/'
else
  echo 'commit: "unknown",'
fi
echo "  npmInfo: {"
  npm version | sed 's/\x1b\[[0-9;:]*[mG]//g' | grep -v '^{' | while read line; do
    key=$(echo "$line" | cut -d ':' -f 1 | tr -d ' ')
    value=$(echo "$line" | cut -d ':' -f 2- | tr -d ' ')
    echo "    \"${key}\": \"${value}\","
  done
echo "  }"
echo "}"