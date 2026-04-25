import { config } from "dotenv";

config();

export function requireEnv(key: string) {
  const value = process.env[key];
  if (!value) throw Error(`Missing requiered environment with key ${key}`);
  return value;
}
