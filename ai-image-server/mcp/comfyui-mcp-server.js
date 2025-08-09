import { MCPServer } from '@modelcontextprotocol/server';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const base = process.env.COMFY_API_BASE || 'http://127.0.0.1:8188';
const server = new MCPServer('comfyui');

async function sendWorkflow(workflow) {
  const res = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });
  return res.json();
}

server.tool('generate_image', async ({ prompt, negative = '', batch = 1, width = 1024, height = 1024, steps = 30, sampler = 'euler', cfg = 7, format = 'png', quality = 100 }) => {
  const wf = JSON.parse(fs.readFileSync(path.resolve('../workflows/txt2img_4k_flux_sdxl.json'), 'utf8'));
  wf.nodes.prompt.value = prompt;
  wf.nodes.negative.value = negative;
  wf.nodes.seed.value = Math.floor(Math.random() * 1e9);
  wf.nodes.sampler.steps = steps;
  wf.nodes.sampler.cfg = cfg;
  wf.nodes.sampler.sampler_name = sampler;
  wf.nodes.save.format = format;
  wf.nodes.save.quality = quality;
  wf.nodes.save.batch_size = batch;
  const job = await sendWorkflow({ workflow: wf });
  return job;
});

server.tool('edit_overlay', async ({ base_path, overlay_path, x = 0, y = 0, scale = 1, opacity = 1, blend = 'normal', format = 'png', quality = 100 }) => {
  const wf = JSON.parse(fs.readFileSync(path.resolve('../workflows/img_edit_overlay.json'), 'utf8'));
  wf.nodes.base_image.path = base_path;
  wf.nodes.overlay.path = overlay_path;
  wf.nodes.composite.x = x;
  wf.nodes.composite.y = y;
  wf.nodes.composite.scale = scale;
  wf.nodes.composite.opacity = opacity;
  wf.nodes.composite.blend_mode = blend;
  wf.nodes.save.format = format;
  wf.nodes.save.quality = quality;
  const job = await sendWorkflow({ workflow: wf });
  return job;
});

server.tool('list_gallery', async ({ since = 0 }) => {
  const gallery = path.resolve('../output');
  const files = fs.readdirSync(gallery).map(f => path.join(gallery, f)).filter(f => fs.statSync(f).mtimeMs > since);
  return files;
});

server.start();
