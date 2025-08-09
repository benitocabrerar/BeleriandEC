#!/usr/bin/env bash
set -e

CUSTOM_DIR=/app/custom_nodes

mkdir -p "$CUSTOM_DIR"
cd "$CUSTOM_DIR"

# ComfyUI-Manager
if [ ! -d "ComfyUI-Manager" ]; then
  git clone https://github.com/ltdrdata/ComfyUI-Manager.git
fi

# Efficiency Nodes (Image Overlay / compositing)
if [ ! -d "EfficiencyNodes" ]; then
  git clone https://github.com/jags111/ComfyUI_Efficiency_Nodes.git EfficiencyNodes
fi

# LayerStyle
if [ ! -d "LayerStyle" ]; then
  git clone https://github.com/pythongosssss/LayerStyle.git
fi

# Save Image Extended
if [ ! -d "SaveImageExtended" ]; then
  git clone https://github.com/cubiq/ComfyUI_InstantID.git SaveImageExtended
fi

# ControlNet / T2I-Adapter
if [ ! -d "ComfyUI_Controlnet_aux" ]; then
  git clone https://github.com/Fannovel16/ComfyUI_Controlnet_aux.git
fi

# Latent Upscale nodes
if [ ! -d "latent-upscale" ]; then
  git clone https://github.com/ssitu/ComfyUI_Latent_Upscale.git latent-upscale
fi

# Placeholder for future video/audio nodes
# git clone https://github.com/YourRepo/Stable-Video-Diffusion.git
# git clone https://github.com/YourRepo/LTX-Video.git
# git clone https://github.com/YourRepo/Mochi.git

pip install --no-cache-dir -r /bootstrap/requirements.txt

echo "Custom nodes installed"
