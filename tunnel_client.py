"""
Simple tunnel client for the cams4 API over WebSocket.

Install dependency:
    pip install websockets

Usage:
    Edit RELAY_URL and API_KEY below, then run:
    python tunnel_client.py
"""

import asyncio
import base64
import json
import uuid

import websockets

RELAY_URL = "ws://localhost:1230"
API_KEY = "secret"  # matches SHARED_KEY env var on the server


def _encode_body(body):
    if body is None:
        return None
    if isinstance(body, str):
        return body
    return ["bytes", base64.b64encode(body).decode()]


def _decode_body(body):
    if body is None:
        return b""
    if isinstance(body, str):
        return body.encode()
    return base64.b64decode(body[1])


class TunnelClient:
    def __init__(self, ws):
        self._ws = ws
        self._pending: dict[str, asyncio.Future] = {}
        self._listener = asyncio.create_task(self._listen())

    async def _listen(self):
        async for raw in self._ws:
            msg = json.loads(raw)
            if msg["type"] == "response":
                fut = self._pending.pop(msg["id"], None)
                if fut and not fut.done():
                    fut.set_result(msg["response"])
            # "frame" messages are outbound WS events (PTZ/IR); handle here if needed

    async def fetch(self, method, path, *, camera=None, headers=None, body=None):
        """
        Send an HTTP request through the tunnel.

        Returns a dict with keys: status (int), headers (dict), body (bytes).
        """
        request_id = str(uuid.uuid4())
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self._pending[request_id] = fut

        all_headers = [["Authorization", f"ApiKey {API_KEY}"]]
        if camera:
            all_headers.append(["X-Camera-Name", camera])
        if headers:
            all_headers.extend(headers.items() if isinstance(headers, dict) else headers)

        init = {"headers": all_headers}
        if method != "GET":
            init["method"] = method
        if body is not None:
            init["body"] = _encode_body(body)

        envelope = {
            "type": "request",
            "id": request_id,
            "request": ["request", f"http://api{path}", init],
        }
        await self._ws.send(json.dumps(envelope))

        # ["response", body, init]
        _, resp_body, resp_init = await fut
        return {
            "status": resp_init.get("status", 200),
            "headers": dict(resp_init.get("headers", [])),
            "body": _decode_body(resp_body),
        }

    def close(self):
        self._listener.cancel()


async def main():
    async with websockets.connect(RELAY_URL) as ws:
        client = TunnelClient(ws)

        # --- examples ---

        # GET PTZ position
        resp = await client.fetch("GET", "/info/position", camera="fox")
        print(f"[{resp['status']}] GET /info/position")
        print(resp["body"].decode())

        # GET resolution
        resp = await client.fetch("GET", "/info/resolution", camera="fox")
        print(f"[{resp['status']}] GET /info/resolution")
        print(resp["body"].decode())

        # POST PTZ move — direction is one of: up, down, left, right, home, stop,
        #                  upleft, upright, downleft, downright
        payload = json.dumps({"direction": "up"}).encode()
        resp = await client.fetch(
            "POST",
            "/ptz/move",
            camera="fox",
            headers=[["Content-Type", "application/json"]],
            body=payload,
        )
        print(f"[{resp['status']}] POST /ptz/move")
        print(resp["body"].decode())

        client.close()


if __name__ == "__main__":
    asyncio.run(main())
