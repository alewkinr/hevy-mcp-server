# Hevy Fitness MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to the [Hevy](https://www.hevyapp.com/) fitness tracking API. This allows you to log workouts, manage routines, browse exercises, and track your fitness progress directly through AI chat interfaces.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomtorggler/hevy-mcp-server)

## 🏋️ Features

This MCP server provides comprehensive access to Hevy's fitness tracking capabilities with **17 MCP tools**:

### Workouts (6 tools)
- **`get_workouts`** - Browse your workout history (paginated)
- **`get_workout`** - Get detailed information about a specific workout
- **`create_workout`** - Log a new workout with exercises, sets, weights, and reps
- **`update_workout`** - Update an existing workout
- **`get_workouts_count`** - Get total number of workouts logged
- **`get_workout_events`** - Get workout change events (updates/deletes) since a date for syncing

### Routines (4 tools)
- **`get_routines`** - List your workout routines
- **`get_routine`** - Get details of a specific routine
- **`create_routine`** - Create a new workout routine template
- **`update_routine`** - Update an existing routine

### Exercises (4 tools)
- **`get_exercise_templates`** - Browse available exercises (includes both Hevy's library and your custom exercises)
- **`get_exercise_template`** - Get detailed information about a specific exercise template
- **`create_exercise_template`** - Create a custom exercise template
- **`get_exercise_history`** - View your performance history for a specific exercise

### Organization (3 tools)
- **`get_routine_folders`** - List your routine folders for organization
- **`get_routine_folder`** - Get details of a specific routine folder
- **`create_routine_folder`** - Create a new routine folder

## 🚀 Quick Start

### Prerequisites

1. **Hevy Pro subscription** - The Hevy API is only available to Pro users
2. **Hevy API Key** - Get yours at https://hevy.com/settings?developer
3. **Docker** (recommended) or **Node.js 18+** for local development

### Option 1: Docker (Recommended)

The easiest way to run the server:

```bash
# Clone the repository
git clone https://github.com/tomtorggler/hevy-mcp-server.git
cd hevy-mcp-server

# Create environment file with your API key
cp .env.example .env
# Edit .env and add your HEVY_API_KEY

# Build and run with Docker Compose
docker-compose up -d
```

Your MCP server will be available at: `http://localhost:8787/mcp`

### Option 2: Local Development

Run directly with Node.js:

```bash
# Clone and install
git clone https://github.com/tomtorggler/hevy-mcp-server.git
cd hevy-mcp-server
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your HEVY_API_KEY

# Build and start
npm run build
npm start
```

### Verify It's Running

```bash
# Check health endpoint
curl http://localhost:8787/health

# Expected response:
# {"status":"healthy","version":"4.0.0","mode":"single-user","transport":"streamable-http"}
```

## 🔌 Connect to AI Clients

### Claude Desktop

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "hevy": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

Restart Claude Desktop and you'll see the Hevy tools available with the 🔌 icon.

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:8787/mcp
```

## 📖 Usage Examples

### Creating a Workout

Once connected, you can ask your AI assistant to log workouts:

> "Log a workout from today at 10am to 11am. I did bench press: 3 sets of 100kg for 10 reps, and squats: 4 sets of 120kg for 8 reps."

The assistant will:
1. Use `get_exercise_templates` to find the exercise IDs
2. Call `create_workout` with the proper structure
3. Confirm the workout was logged successfully

### Viewing Progress

> "Show me my last 5 workouts"

> "What's my exercise history for deadlifts?"

> "Get all workout changes since January 1st, 2024"

### Managing Routines

> "Create a new Push Day routine with bench press (4 sets of 8-12 reps at 100kg) and overhead press (3 sets of 10 reps at 60kg)"

> "Update my Upper Body routine to add pull-ups"

### Creating Custom Exercises

> "Create a custom exercise called 'Tom's Special Cable Flyes' for chest using the cable machine"

### Organizing Routines

> "Create a new folder called 'Summer 2024 Programs'"

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t hevy-mcp-server .
```

### Run Container

```bash
# With environment file
docker run -p 8787:8787 --env-file .env hevy-mcp-server

# Or with inline environment variable
docker run -p 8787:8787 -e HEVY_API_KEY=your_api_key_here hevy-mcp-server
```

### Docker Compose (Recommended)

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Health Checks

The Docker container includes built-in health checks:

```bash
# Check container health
docker ps

# View health check logs
docker inspect <container_id> | grep -A 10 Health
```

## 🔧 Configuration

### Environment Variables

- **`HEVY_API_KEY`** (required) - Your Hevy API key from https://hevy.com/settings?developer
- **`PORT`** (optional, default: 8787) - Server port
- **`NODE_ENV`** (optional, default: production) - Environment mode
- **`LOG_LEVEL`** (optional, default: info) - Logging level

### API Details

#### Workout Structure

When creating workouts, you can specify:
- `title` - Name of the workout (required)
- `start_time` - When the workout started (required, ISO 8601 format)
- `end_time` - When the workout ended (required, ISO 8601 format)
- `description` - Optional workout description
- `is_private` - Whether the workout is private (optional, default: false)
- `exercises` - Array of exercises, each with:
  - `title` - Exercise name from the template (required)
  - `exercise_template_id` - Get this from `get_exercise_templates` (required)
  - `superset_id` - Optional superset ID (null if not in a superset)
  - `notes` - Optional notes for this exercise
  - `sets` - Array of set data with:
    - `type` - "warmup", "normal", "failure", or "dropset" (optional)
    - `weight_kg` - Weight in kilograms (optional)
    - `reps` - Number of repetitions (optional)
    - `distance_meters` - For cardio exercises (optional)
    - `duration_seconds` - For timed exercises (optional)
    - `rpe` - Rating of Perceived Exertion, 6-10 (optional)

**Note:** The `index` field for exercises and sets is automatically generated based on their position in the array.

#### Routine Structure

When creating routines, you can specify:
- `title` - Name of the routine (required)
- `folder_id` - Optional folder ID (null for default "My Routines" folder)
- `notes` - Optional notes for the routine
- `exercises` - Array of exercises, each with:
  - `exercise_template_id` - Get this from `get_exercise_templates` (required)
  - `superset_id` - Optional superset ID (null if not in a superset)
  - `rest_seconds` - Rest time in seconds between sets (optional)
  - `notes` - Optional notes for this exercise
  - `sets` - Array of set data (structure similar to workouts)

**Important:** Unlike workouts, routines do NOT use `index` or `title` fields in exercises/sets. These are generated by the API.

#### Time Format

All timestamps use ISO 8601 format:
```
2024-10-15T10:00:00Z
```

## 📚 Resources

- [Hevy API Documentation](https://hevy.com/settings?developer) - Official API docs
- [MCP Documentation](https://modelcontextprotocol.io/) - Learn about Model Context Protocol
- [Hevy App](https://www.hevyapp.com/) - The Hevy fitness tracking app
- [Claude Desktop](https://claude.ai/download) - Download Claude Desktop

## 🛠️ Development

### Project Structure

```
hevy-mcp-server/
├── src/
│   ├── index.ts              # Node.js HTTP server entry point
│   ├── app.ts                # Hono application
│   ├── mcp-server.ts         # MCP server with 17 tools
│   ├── lib/
│   │   ├── client.ts         # Hevy API client
│   │   ├── schemas.ts        # Zod validation schemas
│   │   ├── transforms.ts     # Data validation
│   │   └── errors.ts         # Error handling
│   └── routes/
│       ├── mcp.ts            # MCP endpoint
│       └── utility.ts        # Health check, home page
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Docker Compose setup
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

### Development Scripts

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Development mode with auto-reload
npm run dev

# Type checking
npm run type-check

# Run tests
npm test

# Code formatting
npm run format

# Docker commands
npm run docker:build          # Build Docker image
npm run docker:run            # Run Docker container
npm run docker:compose        # Run with docker-compose
```

### Adding New Tools

To add new Hevy API capabilities:

1. Add the API method to `src/lib/client.ts`
2. Add tool definition to the `tools` array in `src/mcp-server.ts` (in `ListToolsRequestSchema` handler)
3. Add tool handler in the `switch` statement (in `CallToolRequestSchema` handler)
4. Use existing schemas and validation from `src/lib/`

Example:
```typescript
// In ListToolsRequestSchema handler
{
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' }
    },
    required: ['param']
  }
}

// In CallToolRequestSchema handler  
case 'my_new_tool': {
  const result = await client.myNewMethod(args.param);
  return {
    content: [
      { type: 'text', text: `Result: ${result}` },
      { type: 'text', text: JSON.stringify(result, null, 2) }
    ]
  };
}
```

## 🤝 Contributing

Contributions are welcome!

### How to Contribute

1. Fork the repository and create your branch from `main`
2. Make your changes - add features, fix bugs, or improve documentation
3. Test your changes - run `npm run build` and `npm test`
4. Follow the code style - run `npm run format`
5. Submit a Pull Request with a clear description of your changes

### Areas for Contribution

- Add more Hevy API endpoints
- Improve error handling and validation
- Add comprehensive tests
- Improve documentation and examples
- Report bugs or suggest features via Issues
- Docker deployment optimizations

## 🐛 Troubleshooting

### Server Won't Start

**Error**: `HEVY_API_KEY environment variable is required`

**Solution**: Make sure you've set the `HEVY_API_KEY` in your `.env` file or passed it as an environment variable.

### Docker Container Exits Immediately

**Check logs**:
```bash
docker logs <container_id>
```

**Common issues**:
- Missing or invalid `HEVY_API_KEY`
- Port 8787 already in use (change with `-p 8788:8787`)

### Can't Connect from Claude Desktop

1. Verify server is running: `curl http://localhost:8787/health`
2. Check Claude Desktop config file path is correct
3. Restart Claude Desktop after config changes
4. Check Claude Desktop logs for connection errors

### API Requests Failing

**Error**: `401 Unauthorized - Invalid API key`

**Solution**: 
- Verify your API key at https://hevy.com/settings?developer
- Check that you have an active Hevy Pro subscription
- Regenerate your API key if needed

## 📝 License

Unlicense - see [LICENSE](LICENSE) file for details.

This project is not affiliated with Hevy. Hevy is a trademark of Hevy Studios Inc.

## 🙏 Acknowledgments

- Built with [Hono](https://hono.dev/) - Lightweight web framework
- Uses [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - Official MCP SDK
- API client based on [Hevy API Documentation](https://hevy.com/settings?developer)
