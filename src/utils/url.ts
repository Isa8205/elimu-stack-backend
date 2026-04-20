import { Request } from "express";

export function getBaseUrl(req: Request) {
  return `${req.protocol}://${req.host}`;
}

export function getFileUrl(req: Request, id: string, route='/media') {
  return `${getBaseUrl(req)}${route}/?id=${id}`;
}
