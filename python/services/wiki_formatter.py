import re
from typing import List, Dict, Any

class WikiFormatter:
    @staticmethod
    def normalize_content(content: str) -> str:
        """
        Normalize Wikipedia content by converting wiki markup to clean markdown
        while maintaining structure and readability.
        """
        lines = content.split('\n')
        processed_lines = []
        
        for line in lines:
            line = WikiFormatter._normalize_section_markers(line)
            
            if line.strip():
                processed_lines.append(line)
        
        return '\n'.join(processed_lines)
    
    @staticmethod
    def _normalize_section_markers(line: str) -> str:
        """
        Convert wiki section markers (=== Text ===) to markdown headers
        while keeping wiki format structure intact.
        """
        match = re.match(r'^(=+)\s*(.+?)\s*\1$', line)
        if match:
            equals = match.group(1)
            text = match.group(2).strip()
            level = len(equals) - 1
            if level > 0:
                return f"{'#' * level} {text}"
            return text
        return line
    
    @staticmethod
    def format_sections(content: str) -> List[Dict[str, str]]:
        """
        Parse content into structured sections maintaining wiki format.
        Returns list of dicts with 'heading' and 'content' keys.
        """
        lines = content.split('\n')
        sections = []
        current_section = {'heading': 'Overview', 'content': ''}
        
        for line in lines:
            match = re.match(r'^(=+)\s*(.+?)\s*\1$', line)
            
            if match:
                if current_section['content'].strip():
                    sections.append(current_section)
                
                text = match.group(2).strip()
                current_section = {
                    'heading': text,
                    'content': ''
                }
            else:
                if line.strip():
                    current_section['content'] += (
                        (current_section['content'] + '\n' if current_section['content'] else '')
                        + line
                    )
        
        if current_section['content'].strip():
            sections.append(current_section)
        
        return sections if sections else [{'heading': 'Content', 'content': content}]
    
    @staticmethod
    def apply_user_changes(
        original_content: str,
        changes: List[Dict[str, str]]
    ) -> str:
        """
        Apply user-submitted changes to article content.
        Changes format: [{'oldText': '...', 'newText': '...', 'userId': '...'}]
        """
        result = original_content
        
        for change in sorted(changes, key=lambda x: result.find(x['oldText']), reverse=True):
            old_text = change.get('oldText', '')
            new_text = change.get('newText', '')
            
            if old_text in result:
                result = result.replace(old_text, new_text)
        
        return result
    
    @staticmethod
    def get_summary(content: str, max_length: int = 250) -> str:
        """
        Extract a clean summary from the beginning of content.
        """
        lines = content.split('\n')
        summary_parts = []
        
        for line in lines:
            if re.match(r'^=+', line):
                continue
            
            cleaned = WikiFormatter._normalize_section_markers(line).strip()
            if cleaned and not cleaned.startswith('#'):
                summary_parts.append(cleaned)
                
                if sum(len(p) for p in summary_parts) >= max_length:
                    break
        
        summary = ' '.join(summary_parts)
        return summary[:max_length].rstrip() + ('...' if len(summary) > max_length else '')
