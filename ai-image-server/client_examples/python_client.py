import json
import base64
import requests
import websocket

class ComfyClient:
    def __init__(self, base_url="http://localhost:8188"):
        self.base_url = base_url.rstrip('/')

    def upload_image(self, path):
        with open(path, "rb") as f:
            data = f.read()
        return base64.b64encode(data).decode()

    def run_workflow(self, workflow):
        url = f"{self.base_url}/prompt"
        resp = requests.post(url, json=workflow)
        resp.raise_for_status()
        job = resp.json()
        ws = websocket.create_connection(f"ws://{self.base_url.split('//')[1]}/ws?client_id={job['client_id']}")
        while True:
            msg = json.loads(ws.recv())
            if msg.get('type') == 'executed' and msg.get('data', {}).get('node') == 'save':
                return msg['data']['output'][0]

if __name__ == '__main__':
    client = ComfyClient()
    wf = json.load(open('../workflows/txt2img_4k_flux_sdxl.json'))
    print(client.run_workflow(wf))
