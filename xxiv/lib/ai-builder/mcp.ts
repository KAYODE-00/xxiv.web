import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function toolText(result: { content?: Array<{ type: string; text?: string }> }) {
  return (result.content || [])
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export async function createAiBuilderMcpClient(serverUrl: string) {
  const client = new Client({
    name: 'xxiv-ai-builder',
    version: '1.0.0',
  });

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  await client.connect(transport);

  return {
    client,
    close: async () => {
      await transport.close();
    },
  };
}

export async function callMcpTool<TArgs extends Record<string, unknown>, TResult = Record<string, unknown>>(
  client: Client,
  name: string,
  args: TArgs,
) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(toolText(result) || `MCP tool "${name}" failed`);
  }

  const text = toolText(result);
  if (!text) {
    return null as TResult | null;
  }

  try {
    return JSON.parse(text) as TResult;
  } catch {
    return text as TResult;
  }
}
