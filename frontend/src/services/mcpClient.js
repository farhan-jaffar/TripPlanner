/**
 * Frontend MCP Client Service.
 * Connects directly to the Trip Planner FastMCP Server over Server-Sent Events (SSE).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

class FrontendMcpClientService {
  constructor() {
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.connectingPromise = null;
  }

  getEndpointUrl() {
    if (typeof window !== 'undefined') {
      // Use Vite proxy /mcp/sse or direct URL
      return new URL('/mcp/sse', window.location.origin);
    }
    return new URL('http://127.0.0.1:8001/sse');
  }

  async connect() {
    if (this.connected && this.client) {
      return this.client;
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      try {
        const url = this.getEndpointUrl();
        this.transport = new SSEClientTransport(url);
        this.client = new Client(
          {
            name: 'TripPlannerWebFrontend',
            version: '1.0.0',
          },
          {
            capabilities: {
              tools: {},
              resources: {},
            },
          }
        );

        await this.client.connect(this.transport);
        this.connected = true;
        return this.client;
      } catch (err) {
        this.connected = false;
        this.client = null;
        this.transport = null;
        throw err;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  async disconnect() {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close error
      }
    }
    this.connected = false;
    this.client = null;
    this.transport = null;
  }

  async listTools() {
    const client = await this.connect();
    const res = await client.listTools();
    return res.tools || [];
  }

  async callTool(name, args = {}) {
    const client = await this.connect();
    const res = await client.callTool({
      name,
      arguments: args,
    });

    let textContent = '';
    if (res.content && res.content.length > 0) {
      textContent = res.content.map((c) => c.text || '').join('\n');
    }

    try {
      return JSON.parse(textContent);
    } catch {
      return { status: res.isError ? 'error' : 'success', raw: textContent };
    }
  }

  async readTripsResource() {
    const client = await this.connect();
    const res = await client.readResource({ uri: 'tripplanner://trips' });
    if (res.contents && res.contents.length > 0) {
      const item = res.contents[0];
      const text = item.text || '';
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return null;
  }

  isConnected() {
    return this.connected;
  }
}

export const mcpClientService = new FrontendMcpClientService();
