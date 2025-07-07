import re
import sys
import json
import argparse

class ContentAnalyzer:
    def analyze_content(self, content):
        names = re.findall(r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b', content)

        dates = re.findall(r'\b(?:\d{1,2}[/-])?(?:\d{1,2}[/-])?\d{2,4}\b', content)

        word_count = len(re.findall(r'\b\w+\b', content))

        return {
            "names": list(set(names)),
            "dates": list(set(dates)),
            "word_count": word_count
        }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--content', required=True, help='Content to analyze')
    
    args = parser.parse_args()
    
    analyzer = ContentAnalyzer()
    result = analyzer.analyze_content(args.content)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()