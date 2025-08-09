#!/usr/bin/env bash
# Usage: bash curl_examples.sh

# txt2img example
curl -s -X POST http://localhost:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "sunset over mountains", "workflow": '"$(cat ../workflows/txt2img_4k_flux_sdxl.json)"'}'

# img_edit_overlay example (expects images in /input)
curl -s -X POST http://localhost:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"workflow": '"$(cat ../workflows/img_edit_overlay.json)"'}'
