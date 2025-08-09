# AI Image Server

Servidor de generación y edición de imágenes basado en ComfyUI en contenedores Docker.

## Requisitos
- Windows 11 con WSL2 y Docker Desktop con soporte GPU-PV.
- Drivers NVIDIA 580.88+ y CUDA 13.

## Puesta en marcha
```bash
docker compose --env-file .env -f compose.yaml up -d
```
Abrir http://localhost:8188 y cargar los flujos desde `workflows/`.

## Modelos
Coloca los checkpoints y VAEs en `models/`:
- Flux.1 FP8
- SDXL
- (manual) SD3 / SD3.5

Upscalers y adaptadores en las carpetas correspondientes.

## Tips
- Para trabajar en 4K usa flag `--highvram` si fuera necesario.
- Cada batch se almacena en `output/YYYY-MM-DD/job-id/`.

## Problemas comunes
- Reinstala nodos ejecutando `bootstrap/setup_custom_nodes.sh` dentro del contenedor.
- Verifica `nvidia-smi` dentro del contenedor para confirmar acceso a GPU.
