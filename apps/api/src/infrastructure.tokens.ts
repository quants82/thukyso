export const DATABASE_HEALTH = Symbol("DATABASE_HEALTH");
export const REDIS_HEALTH = Symbol("REDIS_HEALTH");

export interface DependencyHealth {
  ping(): Promise<void>;
}
