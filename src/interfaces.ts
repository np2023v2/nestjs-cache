import { ModuleMetadata, Type } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

/**
 * Cache module configuration options
 */
export interface CacheModuleOptions {
  /**
   * Redis connection options
   */
  redis: RedisOptions;

  /**
   * Default TTL (time to live) in seconds
   * @default 3600 (1 hour)
   */
  ttl?: number;

  /**
   * Key prefix for all cache keys
   * @default 'cache:'
   */
  keyPrefix?: string;
}

/**
 * Factory interface for async configuration
 */
export interface CacheOptionsFactory {
  createCacheOptions(): Promise<CacheModuleOptions> | CacheModuleOptions;
}

/**
 * Async cache module options
 */
export interface CacheModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<CacheOptionsFactory>;
  useClass?: Type<CacheOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<CacheModuleOptions> | CacheModuleOptions;
  inject?: any[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory?: number;
}
