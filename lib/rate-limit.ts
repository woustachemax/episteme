import client from "@/lib/db";
import { subHours } from "date-fns";

const ANON_LIMIT = 10;
const USER_LIMIT = 15;
const REPLY_LIMIT = 15;

export async function getSearchCount(identifier: string, isLoggedIn: boolean): Promise<number> {
  const since = subHours(new Date(), 24);

  if (isLoggedIn) {
    return client.search.count({
      where: {
        userId: identifier,
        createdAt: { gte: since }
      }
    });
  } else {
    return client.search.count({
      where: {
        ipAddress: identifier,
        createdAt: { gte: since }
      }
    });
  }
}

export async function recordSearch({
  userId,
  ipAddress,
  query
}: {
  userId?: string;
  ipAddress: string;
  query: string;
}) {
  await client.search.create({
    data: {
      userId,
      ipAddress,
      query
    }
  });
}

export async function canSearch(identifier: string, isLoggedIn: boolean): Promise<{ allowed: boolean; remaining: number }> {
  const count = await getSearchCount(identifier, isLoggedIn);
  const limit = isLoggedIn ? USER_LIMIT : ANON_LIMIT;
  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count)
  };
}

export async function canReply(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const since = subHours(new Date(), 24);
  const count = await client.threadPost.count({
    where: {
      authorUserId: userId,
      authorType: 'HUMAN',
      createdAt: { gte: since }
    }
  });
  return {
    allowed: count < REPLY_LIMIT,
    remaining: Math.max(0, REPLY_LIMIT - count)
  };
}
