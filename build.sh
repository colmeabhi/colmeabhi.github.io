#!/bin/bash
# ============================================
# Regenerates the site from resume.json:
#   index.html   — the page people see
#   profile.md   — the same content as Markdown, for agents
#   llms.txt     — short index for LLMs (llmstxt.org)
#   sitemap.xml
#
# Usage: ./build.sh
# ============================================

set -e
cd "$(dirname "$0")"
python3 build.py
