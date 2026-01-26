#!/usr/bin/env python3
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from python.services.wiki_formatter import WikiFormatter

class WikiFormatterHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body.decode('utf-8'))
            action = data.get('action', 'normalize')
            content = data.get('content', '')
            
            if action == 'normalize':
                normalized = WikiFormatter.normalize_content(content)
                response = {'success': True, 'content': normalized}
            
            elif action == 'format_sections':
                sections = WikiFormatter.format_sections(content)
                response = {'success': True, 'sections': sections}
            
            elif action == 'apply_changes':
                changes = data.get('changes', [])
                modified = WikiFormatter.apply_user_changes(content, changes)
                response = {'success': True, 'content': modified}
            
            elif action == 'get_summary':
                max_length = data.get('max_length', 250)
                summary = WikiFormatter.get_summary(content, max_length)
                response = {'success': True, 'summary': summary}
            
            else:
                response = {'success': False, 'error': f'Unknown action: {action}'}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode('utf-8'))
        
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8001), WikiFormatterHandler)
    print('Wiki Formatter server running on http://localhost:8001')
    server.serve_forever()
