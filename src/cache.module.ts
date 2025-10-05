import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { CACHE_MODULE_OPTIONS, REDIS_CLIENT } from './constants';
import { CacheModuleAsyncOptions, CacheModuleOptions, CacheOptionsFactory } from './interfaces';

/**
 * NestJS Cache Module using Redis
 *
 * @example
 * // Synchronous configuration
 * CacheModule.forRoot({
 *   redis: {
 *     host: 'localhost',
 *     port: 6379,
 *   },
 *   ttl: 3600,
 *   keyPrefix: 'myapp:',
 * })
 *
 * @example
 * // Asynchronous configuration
 * CacheModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     redis: {
 *       host: config.get('REDIS_HOST'),
 *       port: config.get('REDIS_PORT'),
 *     },
 *     ttl: 3600,
 *   }),
 *   inject: [ConfigService],
 * })
 */
@Global()
@Module({})
export class CacheModule {
  /**
   * Register the cache module synchronously
   * @param options Cache module options
   */
  static forRoot(options: CacheModuleOptions): DynamicModule {
    const redisProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const client = new Redis(options.redis);

        client.on('error', error => {
          console.error('Redis connection error:', error);
        });

        client.on('connect', () => {
          console.log('Redis connected successfully');
        });

        return client;
      },
    };

    const optionsProvider: Provider = {
      provide: CACHE_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: CacheModule,
      providers: [redisProvider, optionsProvider, CacheService],
      exports: [CacheService, REDIS_CLIENT],
    };
  }

  /**
   * Register the cache module asynchronously
   * @param options Async cache module options
   */
  static forRootAsync(options: CacheModuleAsyncOptions): DynamicModule {
    const redisProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: (cacheOptions: CacheModuleOptions) => {
        const client = new Redis(cacheOptions.redis);

        client.on('error', error => {
          console.error('Redis connection error:', error);
        });

        client.on('connect', () => {
          console.log('Redis connected successfully');
        });

        return client;
      },
      inject: [CACHE_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: CacheModule,
      imports: options.imports || [],
      providers: [...asyncProviders, redisProvider, CacheService],
      exports: [CacheService, REDIS_CLIENT],
    };
  }

  /**
   * Create async providers based on the configuration
   */
  private static createAsyncProviders(options: CacheModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  /**
   * Create async options provider
   */
  private static createAsyncOptionsProvider(options: CacheModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: CACHE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: CACHE_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CacheOptionsFactory) =>
        await optionsFactory.createCacheOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}
