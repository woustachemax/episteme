import { spawn } from "child_process";
import path from "path";

export interface WebSource {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function searchWebSources(query: string): Promise<WebSource[]> {
  if (process.env.VERCEL) {
    return searchViaVercelFunction(query);
  }
  return searchViaLocalPython(query);
}

async function searchViaVercelFunction(query: string): Promise<WebSource[]> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    const response = await fetch(`${baseUrl}/api/websearch?query=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      console.error("Vercel Python search function returned", response.status);
      return [];
    }
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Vercel Python search function failed:", error);
    return [];
  }
}

async function searchViaLocalPython(query: string): Promise<WebSource[]> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "python/services/web_search.py");
    const python = spawn("python3", [scriptPath, "--query", query]);

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      python.kill();
      resolve([]);
    }, 15000);

    python.stdout.on("data", (data) => { stdout += data.toString(); });
    python.stderr.on("data", (data) => { stderr += data.toString(); });

    python.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error("Web search script failed:", stderr);
        resolve([]);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error("Failed to parse web search output:", error);
        resolve([]);
      }
    });

    python.on("error", (error) => {
      clearTimeout(timeout);
      console.error("Failed to start web search process:", error);
      resolve([]);
    });
  });
}
