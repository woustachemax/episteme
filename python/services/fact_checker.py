import re
import json
import argparse

class FactChecker:
    def __init__(self):
        self.bias_words = [
            'amazing', 'terrible', 'best', 'worst', 'incredible', 'awful',
            'fantastic', 'horrible', 'perfect', 'useless', 'revolutionary',
            'groundbreaking', 'devastating', 'brilliant'
        ]
    
    def check_facts(self, content):
        factual_claims = re.findall(r'[^.!?]*(?:\d{4}|\$[\d,]+|\d+(?:,\d{3})*)[^.!?]*[.!?]', content)
        
        found_bias = []
        for word in self.bias_words:
            if re.search(r'\b' + word + r'\b', content, re.IGNORECASE):
                found_bias.append(word)
        
        confidence = max(0.3, 1.0 - (len(found_bias) * 0.1))
        
        return {
            "factual_claims": factual_claims[:5],  
            "bias_words_found": found_bias,
            "confidence_score": round(confidence, 2),
            "total_claims": len(factual_claims)
        }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--content', required=True, help='Content to fact-check')
    
    args = parser.parse_args()
    
    checker = FactChecker()
    result = checker.check_facts(args.content)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()