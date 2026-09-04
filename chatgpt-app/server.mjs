import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_URI = 'ui://noodle3d/controller.html';
const widgetHtml = fs.readFileSync(path.join(__dirname, 'widget.html'), 'utf8');
const port = Number(process.env.PORT || 8000);

function createServer() {
  const server = new McpServer({ name: 'noodle3d', version: '0.1.0' });

  registerAppTool(server, 'play_noodle3d', {
    title: 'Play Noodle3D',
    description: 'Open the deterministic vector-native Noodle3D first-person controller arena inside ChatGPT. Use when the user asks to play, test, open, or inspect the Noodle controller or vector 3D arena.',
    inputSchema: {
      seed: z.string().min(1).max(128).optional().describe('Deterministic arena seed.'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    _meta: { ui: { resourceUri: WIDGET_URI } },
  }, async ({ seed }) => {
    const resolvedSeed = seed || 'controller-proof';
    return {
      content: [{
        type: 'text',
        text: `Noodle3D is open with deterministic seed ${resolvedSeed}. The game runs in the ChatGPT widget; fullscreen is requested only from the user's FULL button.`,
      }],
      structuredContent: {
        seed: resolvedSeed,
        build: 'noodle3d-chatgpt-v1',
        renderer: 'vector-projection-svg',
        controller: 'armless-quake-kata',
      },
    };
  });

  registerAppResource(server, 'Noodle3D Controller', WIDGET_URI, {
    mimeType: RESOURCE_MIME_TYPE,
    description: 'Interactive vector-native Noodle3D first-person controller widget.',
  }, async () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: {
          prefersBorder: false,
        },
      },
    }],
  }));

  return server;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/', (_req, res) => res.type('text').send('Noodle3D MCP app'));

for (const method of ['post', 'get', 'delete']) {
  app[method]('/mcp', async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) res.status(500).send('MCP error');
    }
  });
}

app.listen(port, () => {
  console.log(`Noodle3D MCP app listening on http://localhost:${port}/mcp`);
});
