# NestJS Cache Module

A reusable NestJS module for caching with Redis connection and common cache utilities.

## Features

- 🚀 Easy integration with NestJS applications
- 🔌 Redis-based caching with ioredis
- 🛠️ Common cache utilities (get, set, delete, etc.)
- ⚙️ Configurable TTL and key prefixes
- 📊 Cache statistics
- 🔄 Async configuration support
- 🌐 Global module support
- 💪 TypeScript support with full type definitions

## Installation

```bash
npm install @np2023v2/nestjs-cache ioredis
```

## Usage

### Basic Setup (Synchronous)

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@np2023v2/nestjs-cache';

@Module({
  imports: [
    CacheModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'your-password', // optional
      },
      ttl: 3600, // Default TTL in seconds (1 hour)
      keyPrefix: 'myapp:', // Optional key prefix
    }),
  ],
})
export class AppModule {}
```

### Async Setup (with ConfigService)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@np2023v2/nestjs-cache';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
        ttl: 3600,
        keyPrefix: 'myapp:',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Using the Cache Service

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '@np2023v2/nestjs-cache';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: CacheService) {}

  async getUser(id: string) {
    // Try to get from cache first
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const user = await this.fetchUserFromDatabase(id);
    
    // Store in cache for 1 hour
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    return user;
  }

  async deleteUser(id: string) {
    // Delete from cache
    await this.cacheService.delete(`user:${id}`);
    // Delete from database
    await this.deleteUserFromDatabase(id);
  }
}
```

## API Reference

### CacheService Methods

#### `get<T>(key: string): Promise<T | null>`
Get a value from cache.

```typescript
const user = await cacheService.get<User>('user:123');
```

#### `set<T>(key: string, value: T, ttl?: number): Promise<boolean>`
Set a value in cache with optional TTL.

```typescript
await cacheService.set('user:123', user, 3600);
```

#### `delete(key: string): Promise<boolean>`
Delete a key from cache.

```typescript
await cacheService.delete('user:123');
```

#### `deleteMany(keys: string[]): Promise<number>`
Delete multiple keys from cache.

```typescript
await cacheService.deleteMany(['user:123', 'user:456']);
```

#### `exists(key: string): Promise<boolean>`
Check if a key exists in cache.

```typescript
const exists = await cacheService.exists('user:123');
```

#### `getTtl(key: string): Promise<number>`
Get remaining TTL for a key.

```typescript
const ttl = await cacheService.getTtl('user:123');
```

#### `expire(key: string, ttl: number): Promise<boolean>`
Set expiry time for a key.

```typescript
await cacheService.expire('user:123', 3600);
```

#### `clear(): Promise<number>`
Clear all cache keys with the configured prefix.

```typescript
await cacheService.clear();
```

#### `getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T>`
Get a value from cache, or set it if not found.

```typescript
const user = await cacheService.getOrSet(
  'user:123',
  async () => await fetchUserFromDatabase('123'),
  3600
);
```

#### `increment(key: string, amount?: number): Promise<number>`
Increment a numeric value in cache.

```typescript
await cacheService.increment('page-views', 1);
```

#### `decrement(key: string, amount?: number): Promise<number>`
Decrement a numeric value in cache.

```typescript
await cacheService.decrement('stock:item-123', 1);
```

#### `getStats(): Promise<CacheStats>`
Get cache statistics.

```typescript
const stats = await cacheService.getStats();
// { hits: 100, misses: 10, keys: 50 }
```

#### `keys(pattern?: string): Promise<string[]>`
Get all keys matching a pattern.

```typescript
const userKeys = await cacheService.keys('user:*');
```

#### `getClient(): Redis`
Get the underlying Redis client for advanced operations.

```typescript
const redis = cacheService.getClient();
await redis.ping();
```

## Configuration Options

### CacheModuleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redis` | `RedisOptions` | Required | Redis connection options (from ioredis) |
| `ttl` | `number` | `3600` | Default TTL in seconds |
| `keyPrefix` | `string` | `'cache:'` | Key prefix for all cache keys |

### Redis Options

The `redis` option accepts all [ioredis configuration options](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options).

Common options:
- `host`: Redis server host
- `port`: Redis server port
- `password`: Redis password
- `db`: Redis database number
- `tls`: TLS options for secure connections

## License

MIT
