#!/bin/bash
# Double-click this file (on a Mac) to open the website editor.
cd "$(dirname "$0")" || exit 1

# Find Node.js, including the usual install locations.
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "The website editor needs one free program called Node.js.\n\nClick “Download” to get it. Open the downloaded file and click through the installer, then double-click “Edit Website” again." with title "One-time setup" buttons {"Cancel", "Download"} default button "Download"' >/dev/null 2>&1 \
    && open "https://nodejs.org/en/download"
  exit 0
fi

clear
node cms/server.js --open
