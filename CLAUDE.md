# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server with hot reload (tsx watch)
npm run start     # Run server (no separate build step)
```

No test runner or linter is configured. Prettier runs automatically on staged files via lint-staged/husky pre-commit hook. Dev server runs on port defined in `configs/service.json` (default: 1229).

## Architecture

TypeScript/Hono REST API that controls Axis network cameras via the VAPIX protocol. Abstracts PTZ, imaging, and IR operations behind a unified HTTP API with WebSocket support for real-time events.

### Request Flow

```
Request → AuthorizationMiddleware → CameraMiddleware → CapabilitiesMiddleware → Handler → VAPIX API Call → Camera
```

- **AuthorizationMiddleware**: validates `Authorization: ApiKey <key>` header (`SHARED_KEY` env var)
- **CameraMiddleware**: resolves `X-Camera-Name` header to a `Camera` object, sets on Hono context
- **CapabilitiesMiddleware**: validates the resolved camera supports the required capability (e.g. `"PTZ"`, `"IrCutFilter"`)

### Module System

Each feature area is a `Module` (`src/modules/module.ts`). Modules are registered in `src/index.ts` and enabled/disabled via `configs/service.json` → `moduleMap`.

**Module pattern:**

```
src/modules/{name}/
  index.ts         # Route registration wiring handlers + middleware
  *_handler.ts     # Individual endpoint handlers — each exports { openapi, handle }
```

Modules: `ptz`, `imaging`, `daynight`, `info`, `settings`, `config`.

### Managers (Singletons)

All exported from `src/managers/index.ts`:

- **ConfigManager** — loads `configs/cameras.json`, `service.json`, `specs.json`, `presets.json`
- **CameraManager** — maintains camera instances with DigestClient for VAPIX authentication
- **VAPIXManager** — authenticated HTTP calls to camera VAPIX CGI endpoints; `URLBuilder()`, `GetParameter()`, `SetParameter()`
- **WebSocketManager** — outbound WS to clients (port 3130), dispatches camera events to observers

### WebSocket Event Flow

1. `CameraManager.connectWebsocket()` opens `ws://{host}/vapix/ws-data-stream` per camera
2. Events dispatched via `WebSocketManager.processMessage()` to registered observers
3. Observers broadcast formatted messages to connected clients

**Observer interface** (`src/models/observer.ts`): implement `{ name, cameras, topics, handler }`, export from `src/observers/index.ts`, add to `observers` array in `websocket_manager.ts`.

Existing observers: `PTZObserver` (topic: `ptz`), `IRObserver` (topic: `ir`).

### Camera Configuration

Cameras defined in `configs/cameras.json`. Credentials from env: `{CAMERA_UPPERCASE}_USERNAME` / `{CAMERA_UPPERCASE}_PASSWORD`. Camera specs (zoom range, pan/tilt limits, sensor dimensions) in `configs/specs.json` — used for motion calculations.

### Code Style

- Tabs for indentation, semicolons required (see `.prettierrc`, `.editorconfig`)
- TypeScript strict mode; path alias `@/*` → `src/*`
- `verbatimModuleSyntax` enabled — use `import type` for type-only imports
