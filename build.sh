#!/bin/bash
# ============================================
# Assembles index.html from:
#   - index-head.html  (everything before page content)
#   - pages/*.html      (each section, in order)
#   - index-foot.html  (everything after page content)
#
# Usage: ./build.sh
# ============================================

set -e
cd "$(dirname "$0")"

PAGE_ORDER="home work education projects skills certs resume"

{
    cat index-head.html

    for page in $PAGE_ORDER; do
        echo ""
        cat "pages/${page}.html"
    done

    cat index-foot.html
} > index.html

echo "Built index.html"
