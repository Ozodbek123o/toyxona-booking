import { execSync } from 'node:child_process'

const ports = [5000, 5173, 5174]
const pids = new Set()

for (const port of ports) {
	try {
		const out = execSync(`netstat -ano | findstr :${port}`, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'ignore'],
		})
		for (const line of out.split('\n')) {
			if (!line.includes('LISTENING')) continue
			const pid = Number(line.trim().split(/\s+/).pop())
			if (pid > 0) pids.add(pid)
		}
	} catch {
		// port free
	}
}

for (const pid of pids) {
	try {
		execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
		console.log(`Freed port: stopped PID ${pid}`)
	} catch {
		// already gone
	}
}
