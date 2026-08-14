import sys
import json
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, parse_qs, unquote

import requests
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
EXCLUDED_DOMAINS = ["reddit.com", "quora.com", "answers.yahoo.com", "wikipedia.org"]
MAX_RESULTS = 8
FETCH_TIMEOUT = 6
MAX_CONTENT_CHARS = 2500


def is_excluded(url):
    host = urlparse(url).netloc.lower()
    return any(host == d or host.endswith("." + d) for d in EXCLUDED_DOMAINS)


def unwrap_ddg_link(href):
    if "duckduckgo.com/l/" in href:
        parsed = urlparse(href if href.startswith("http") else "https:" + href)
        target = parse_qs(parsed.query).get("uddg")
        if target:
            return unquote(target[0])
    return href


def search_duckduckgo(query, limit):
    resp = requests.post(
        "https://html.duckduckgo.com/html/",
        data={"q": query},
        headers={"User-Agent": USER_AGENT},
        timeout=8
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for link in soup.select("a.result__a"):
        url = unwrap_ddg_link(link.get("href", ""))
        title = link.get_text(strip=True)
        if not url.startswith("http") or is_excluded(url):
            continue
        results.append({"title": title, "url": url})
        if len(results) >= limit:
            break
    return results


def extract_text(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "noscript"]):
        tag.decompose()

    container = soup.find("article") or soup
    paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    return " ".join(p for p in paragraphs if len(p) > 40)[:MAX_CONTENT_CHARS]


def fetch_page(result, rank, total):
    try:
        resp = requests.get(result["url"], headers={"User-Agent": USER_AGENT}, timeout=FETCH_TIMEOUT)
        resp.raise_for_status()
        content = extract_text(resp.text)
        if len(content) < 100:
            return None
        return {
            "title": result["title"],
            "url": result["url"],
            "content": content,
            "score": round(1.0 - (rank / max(total, 1)) * 0.5, 3)
        }
    except Exception:
        return None


def search_web(query, limit=MAX_RESULTS):
    results = search_duckduckgo(query, limit)
    sources = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch_page, r, i, len(results)) for i, r in enumerate(results)]
        for future in as_completed(futures):
            source = future.result()
            if source:
                sources.append(source)
    sources.sort(key=lambda s: s["score"], reverse=True)
    return sources


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    args = parser.parse_args()

    try:
        print(json.dumps(search_web(args.query)))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
