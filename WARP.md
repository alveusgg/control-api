# cams4 Project Guide (AI generated document)

## Overview

cams4 is a TypeScript-based HTTP server that provides a RESTful API for controlling Axis network cameras using the VAPIX API. The server uses Hono as the web framework and features a modular architecture for different camera capabilities.

## Architecture

### Core Components

- **Server** (`src/server/server.ts`): Hono-based HTTP server that manages modules and initializes managers
- **Managers**: Singleton-style managers for configuration, cameras, and VAPIX API interactions
- **Modules**: Pluggable feature modules (PTZ, Day/Night) that register routes
- **Middleware**: Camera validation and capability checking middleware
- **Models**: Type definitions for cameras and other domain objects

### Project Structure

```
src/
├── index.ts                    # Entry point
├── constants.ts                # Global constants and type definitions
├── utils.ts                    # Utility functions (error responses)
├── models/
│   └── camera.ts              # Camera interface definition
├── managers/
│   ├── index.ts               # Manager exports
│   ├── camera_manager.ts      # Camera instance management
│   ├── config_manager.ts      # Configuration loading from JSON files
│   └── vapix_manager.ts       # VAPIX API communication
├── modules/
│   ├── module.ts              # Module interface and registry
│   ├── ptz/                   # Pan-Tilt-Zoom module
│   │   ├── index.ts
│   │   ├── moveHandler.ts     # Directional movement endpoint
│   │   └── panHandler.ts      # Pan by degrees endpoint
│   └── daynight/              # IR filter control module
│       ├── index.ts
│       └── irFilterHandler.ts # IR cut filter endpoint
├── server/
│   ├── server.ts              # Main server class
│   └── middleware/
│       ├── index.ts           # Middleware exports
│       ├── camera.ts          # Camera header validation
│       └── capabilities.ts    # Camera capability checking
└── errors/
    └── error_codes.ts         # Error code enumeration

configs/
├── cameras.json               # Camera definitions (host, capabilities)
└── test.json                  # Additional config files

.env                           # Camera credentials (CAMERENAME_USERNAME, CAMERENAME_PASSWORD)
```

## Development

### Setup

```bash
npm install
```

### Running

```bash
# Development with watch mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

The server runs on `http://localhost:3000` by default.

### Environment Variables

Camera credentials are stored in `.env` with the following pattern:

```
CAMERAMAN_USERNAME="username"
CAMERAMAN_PASSWORD="password"
```

Where `CAMERAMAN` is the uppercase version of the camera name from `configs/cameras.json`.

## Configuration

### Adding a Camera

Edit `configs/cameras.json`:

```json
{
	"camera_name": {
		"name": "camera_name",
		"host": "192.168.1.100",
		"capabilities": ["PTZ", "IrCutFilter"]
	}
}
```

Then add credentials to `.env`:

```
CAMERA_NAME_USERNAME="root"
CAMERA_NAME_PASSWORD="password"
```

### Supported Capabilities

- `PTZ`: Pan-Tilt-Zoom controls (movement and pan endpoints)
- `IrCutFilter`: IR cut filter control for day/night mode

## API Usage

### Request Headers

All API requests require the `X-Camera-Name` header to specify which camera to control:

```
X-Camera-Name: pasture
```

### PTZ Module Endpoints

#### POST /ptz/move

Move camera in a direction or stop movement.

```json
{
  "direction": "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright" | "home" | "stop"
}
```

#### POST /ptz/pan

Pan camera to specific degrees.

```json
{
  "degrees": -180.0 to 180.0
}
```

### Day/Night Module Endpoints

#### POST /ir/filter

Control IR cut filter state.

```json
{
  "state": "on" | "off" | "auto"
}
```

### Error Responses

API errors return JSON with the following structure:

```json
{
	"code": 1,
	"details": "Error message"
}
```

Error codes:

- `1`: InvalidContextCode - Internal server error, context not set properly
- `2`: UnsupportedActionCode - Camera doesn't support requested capability
- `3`: MissingRequiredHeaderCode - Missing X-Camera-Name header
- `4`: UnknownCameraCode - Camera name not found in configuration

## Adding New Modules

### 1. Create Module Structure

```
src/modules/newmodule/
├── index.ts           # Module definition
└── handler.ts         # Route handler
```

### 2. Define Module

In `src/modules/newmodule/index.ts`:

```typescript
import type { Module } from "@/modules/module";
import { Hono } from "hono";
import * as constants from "@/constants";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

const NewModule: Module = {
	name: "NewModule",
	basePath: "/newmodule",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const module = new Hono<{ Variables: constants.Variables }>();

		module.use(CameraMiddleware);

		module.on(
			"POST",
			"/action",
			CapabilitiesMiddleware("RequiredCapability"),
			...Handler.handle(),
		);

		return module;
	},
	Shutdown: (): void => {},
};

export default NewModule;
```

### 3. Create Handler

In `src/modules/newmodule/handler.ts`:

```typescript
import { createFactory } from "hono/factory";
import * as z from "zod";
import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";

const actionAdapter = z.object({
	param: z.string(),
});

const ActionHandler: Handler = {
	adapter: actionAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let action = actionAdapter.parse(await ctx.req.json());
			let camera = ctx.get(constants.targetCameraKey);

			let url = VAPIXManager.URLBuilder("api_name", camera.host, {
				param: action.param,
			});
			let response = await VAPIXManager.makeAPICall(url, camera.login);

			return ctx.text(response as string);
		});
	},
};

export default ActionHandler;
```

### 4. Register Module

Add to `src/modules/module.ts`:

```typescript
import NewModule from "./newmodule";

export const modules: Module[] = [
	PTZModule,
	DayNightModule,
	NewModule, // Add here
];
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (lightweight web framework)
- **Validation**: Zod (schema validation)
- **Build Tool**: Vite (with SSR mode)
- **Development**: tsx (TypeScript execution with watch mode)

## TypeScript Configuration

- **Module Resolution**: bundler mode
- **Path Aliases**: `@/*` maps to `src/*`
- **JSX**: React JSX with Hono JSX runtime
- **Target**: ESNext with strict mode enabled

## Key Design Patterns

### Manager Pattern

Managers are singleton-style objects that handle cross-cutting concerns:

- `CameraManager`: Loads and retrieves camera instances
- `ConfigManager`: Loads all JSON config files from `configs/` directory
- `VAPIXManager`: Builds VAPIX URLs and makes authenticated API calls

### Module Pattern

Modules are self-contained feature units that:

- Define their own routes and base path
- Use middleware for camera and capability validation
- Register handlers for specific endpoints
- Can be enabled/disabled by registration in `modules` array

### Handler Pattern

Handlers implement request processing:

- Define Zod schema for request validation (`adapter`)
- Implement business logic in `handle()` function
- Access camera from Hono context (set by `CameraMiddleware`)
- Return responses using Hono context methods

### Middleware Chain

1. `CameraMiddleware`: Validates `X-Camera-Name` header and loads camera into context
2. `CapabilitiesMiddleware`: Checks if camera supports required capabilities
3. Handler: Processes the actual request

## VAPIX Integration

The server communicates with Axis cameras using the VAPIX API:

- URLs are built using `VAPIXManager.URLBuilder(api, target, params)`
- Authentication uses Basic Auth with base64-encoded credentials
- Test mode returns URL string instead of making actual requests (controlled by 4th parameter)

## Notes

- The server currently has a test mode flag in `VAPIXManager.makeAPICall()` (defaults to true)
- Camera hosts in config should be IP hosts without protocol
- All camera names are case-sensitive in headers but converted to uppercase for environment variables
- The server uses `btoa()` for Base64 encoding credentials (browser API available in Node.js)
