import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initializeWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'search') {
          await handleSearchRequest(ws, data.query);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}

async function handleSearchRequest(ws: WebSocket, query: string) {
  try {
    ws.send(JSON.stringify({ type: 'status', message: 'Starting search...' }));

    // Send search status
    ws.send(JSON.stringify({ type: 'status', message: 'Resolving entity...' }));
    
    // Entity resolution happens here
    const entityRes = await fetch('http://localhost:3000/api/entity-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => r.json()).catch(() => ({
      type: 'concept',
      confidence: 0,
      context: '',
      keywords: [],
      sources: []
    }));

    ws.send(JSON.stringify({ type: 'entity', data: entityRes }));

    ws.send(JSON.stringify({ type: 'status', message: 'Searching the web...' }));
    
    const searchRes = await fetch('http://localhost:3000/api/search-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources: entityRes.sources })
    }).then(r => r.text()).catch(() => '');

    ws.send(JSON.stringify({ type: 'status', message: 'Generating content...' }));

    const contentRes = await fetch('http://localhost:3000/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, searchResults: searchRes, entity: entityRes })
    });

    if (contentRes.body) {
      const reader = contentRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              ws.send(JSON.stringify({ type: 'status', message: 'Analyzing content...' }));
            } else {
              try {
                const json = JSON.parse(data);
                if (json.choices?.[0]?.delta?.content) {
                  ws.send(JSON.stringify({
                    type: 'content_chunk',
                    chunk: json.choices[0].delta.content
                  }));
                }
              } catch {
                
              }
            }
          }
        }
      }
    }

    ws.send(JSON.stringify({ type: 'status', message: 'Analysis complete' }));
    ws.send(JSON.stringify({ type: 'complete' }));
  } catch (error) {
    console.error('Search request error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Search failed'
    }));
  }
}

export function getWebSocketServer() {
  return wss;
}
