// src/middleware/logger.ts
import { Request, Response, NextFunction } from 'express'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  return colors.green
}

function getMethodColor(method: string): string {
  const map: Record<string, string> = {
    GET: colors.green,
    POST: colors.cyan,
    PUT: colors.yellow,
    PATCH: colors.yellow,
    DELETE: colors.red,
  }
  return map[method] ?? colors.reset
}

export function logger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const method = req.method
    const url = req.originalUrl

    const statusColor = getStatusColor(status)
    const methodColor = getMethodColor(method)

    console.log(
      `${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
      `${methodColor}${method.padEnd(7)}${colors.reset} ` +
      `${url.padEnd(30)} ` +
      `${statusColor}${status}${colors.reset} ` +
      `${colors.dim}${duration}ms${colors.reset}`
    )
  })

  next()
}
