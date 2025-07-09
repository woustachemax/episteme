from http.server import BaseHTTPRequestHandler
import json
import re

class handler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.bias_words = [
            'amazing', 'terrible', 'best', 'worst', 'incredible', 'awful',
            'fantastic', 'horrible', 'perfect', 'useless', 'revolutionary',
            'groundbreaking', 'devastating', 'brilliant'
        ]
        super().__init__(*args, **kwargs)
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            content = data.get('content', '')
            
            factual_claims = re.findall(r'[^.!?]*(?:\d{4}|\$[\d,]+|\d+(?:,\d{3})*)[^.!?]*[.!?]', content)
            
            found_bias = []
            for word in self.bias_words:
                if re.search(r'\b' + word + r'\b', content, re.IGNORECASE):
                    found_bias.append(word)
            
            confidence = max(0.3, 1.0 - (len(found_bias) * 0.1))
            
            result = {
                "factual_claims": factual_claims[:5],
                "bias_words_found": found_bias,
                "confidence_score": round(confidence, 2),
                "total_claims": len(factual_claims)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = {"error": f"Fact check failed: {str(e)}"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()