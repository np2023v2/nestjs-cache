import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  CACHE_MODULE_OPTIONS,
  DEFAULT_CACHE_TTL,
  DEFAULT_KEY_PREFIX,
  REDIS_CLIENT,
} from './constants';
import { CacheModuleOptions, CacheStats } from './interfaces';

/**
 * Cache service providing common utilities for caching operations
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl: number;
  private readonly keyPrefix: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(CACHE_MODULE_OPTIONS) private readonly options: CacheModuleOptions,
  ) {
    this.defaultTtl = options.ttl || DEFAULT_CACHE_TTL;
    this.keyPrefix = options.keyPrefix || DEFAULT_KEY_PREFIX;
  }

  /**
   * Build a cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key);
      const value = await this.redis.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, uses default if not provided)
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTtl;

      await this.redis.setex(cacheKey, expiry, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   * @param keys Array of cache keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) {
        return 0;
      }

      const cacheKeys = keys.map(key => this.buildKey(key));
      return await this.redis.del(...cacheKeys);
    } catch (error) {
      this.logger.error('Error deleting multiple cache keys:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async getTtl(key: string): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      this.logger.error(`Error getting TTL for cache key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Set expiry time for a key
   * @param key Cache key
   * @param ttl Time to live in seconds
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiry for cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache keys with the configured prefix
   */
  async clear(): Promise<number> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get or set a value in cache
   * If the key exists, return its value. Otherwise, execute the factory function,
   * cache the result, and return it.
   *
   * @param key Cache key
   * @param factory Function to generate value if not cached
   * @param ttl Time to live in seconds (optional)
   */
  async getOrSet<T = any>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment a numeric value in cache
   * @param key Cache key
   * @param amount Amount to increment by (default: 1)
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      return await this.redis.incrby(cacheKey, amount);
    } catch (error) {
      this.logger.error(`Error incrementing cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a numeric value in cache
   * @param key Cache key
   * @param amount Amount to decrement by (default: 1)
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      return await this.redis.decrby(cacheKey, amount);
    } catch (error) {
      this.logger.error(`Error decrementing cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      const info = await this.redis.info('stats');

      // Parse hits and misses from info string
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      return {
        hits: hitsMatch ? parseInt(hitsMatch[1], 10) : 0,
        misses: missesMatch ? parseInt(missesMatch[1], 10) : 0,
        keys: keys.length,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        hits: 0,
        misses: 0,
        keys: 0,
      };
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern Key pattern (without prefix)
   */
  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      const searchPattern = `${this.keyPrefix}${pattern}`;
      const keys = await this.redis.keys(searchPattern);

      // Remove prefix from keys
      return keys.map(key => key.substring(this.keyPrefix.length));
    } catch (error) {
      this.logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Get the underlying Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}
