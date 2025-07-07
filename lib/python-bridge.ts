import { spawn } from 'child_process';
import path from 'path';

export async function callPythonAnalyzer(content: string) {
    return new Promise((resolve, reject) => {
        const pythonPath = path.join(process.cwd(), 'python/services/content_analyzer.py');

        const python = spawn('python3', [pythonPath, '--content', content]);

        let result = '';
        let error = '';

        python.stdout.on('data', (data) => {
            result += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    reject(new Error('Failed to parse Python output'));
                }
            } else {
                reject(new Error(error || 'Python script failed'));
            }
        });
    });
}
