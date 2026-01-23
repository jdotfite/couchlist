import { db } from './db';
import { UserStreamingService, StreamingProvider, TOP_US_PROVIDERS, PROVIDER_MAP } from '@/types/streaming';

// Get user's saved streaming services
export async function getUserStreamingServices(userId: number): Promise<UserStreamingService[]> {
  const result = await db`
    SELECT id, user_id, provider_id, provider_name, logo_path, created_at
    FROM user_streaming_services
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;
  return result.rows as UserStreamingService[];
}

// Set user's streaming services (replaces all existing)
export async function setUserStreamingServices(
  userId: number,
  providerIds: number[]
): Promise<UserStreamingService[]> {
  // Delete existing services
  await db`
    DELETE FROM user_streaming_services
    WHERE user_id = ${userId}
  `;

  // Insert new services
  if (providerIds.length > 0) {
    const values = providerIds.map(providerId => {
      const provider = PROVIDER_MAP[providerId];
      return {
        user_id: userId,
        provider_id: providerId,
        provider_name: provider?.provider_name || `Provider ${providerId}`,
        logo_path: provider?.logo_path || null,
      };
    });

    for (const value of values) {
      await db`
        INSERT INTO user_streaming_services (user_id, provider_id, provider_name, logo_path)
        VALUES (${value.user_id}, ${value.provider_id}, ${value.provider_name}, ${value.logo_path})
        ON CONFLICT (user_id, provider_id) DO NOTHING
      `;
    }
  }

  // Return updated list
  return getUserStreamingServices(userId);
}

// Add a single streaming service
export async function addUserStreamingService(
  userId: number,
  providerId: number
): Promise<UserStreamingService | null> {
  const provider = PROVIDER_MAP[providerId];
  if (!provider) return null;

  await db`
    INSERT INTO user_streaming_services (user_id, provider_id, provider_name, logo_path)
    VALUES (${userId}, ${providerId}, ${provider.provider_name}, ${provider.logo_path})
    ON CONFLICT (user_id, provider_id) DO NOTHING
  `;

  const result = await db`
    SELECT id, user_id, provider_id, provider_name, logo_path, created_at
    FROM user_streaming_services
    WHERE user_id = ${userId} AND provider_id = ${providerId}
  `;

  return result.rows[0] as UserStreamingService || null;
}

// Remove a single streaming service
export async function removeUserStreamingService(
  userId: number,
  providerId: number
): Promise<boolean> {
  const result = await db`
    DELETE FROM user_streaming_services
    WHERE user_id = ${userId} AND provider_id = ${providerId}
  `;
  return result.rowCount !== null && result.rowCount > 0;
}

// Get user's provider IDs as an array
export async function getUserProviderIds(userId: number): Promise<number[]> {
  const services = await getUserStreamingServices(userId);
  return services.map(s => s.provider_id);
}

// Get top providers with user's services highlighted (for UI display)
export async function getProvidersForUser(userId: number): Promise<{
  userServices: StreamingProvider[];
  otherServices: StreamingProvider[];
}> {
  const userProviderIds = await getUserProviderIds(userId);
  const userProviderIdSet = new Set(userProviderIds);

  const userServices: StreamingProvider[] = [];
  const otherServices: StreamingProvider[] = [];

  for (const provider of TOP_US_PROVIDERS) {
    if (userProviderIdSet.has(provider.provider_id)) {
      userServices.push(provider);
    } else {
      otherServices.push(provider);
    }
  }

  return { userServices, otherServices };
}
