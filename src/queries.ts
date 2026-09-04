'use server';

import { findAsks, type Search } from './lib/asks.ts';
import { warmCache } from './lib/github.ts';

// The server loads this module once: fill the cache before the first visitor asks.
warmCache();

// The one server function the island calls. Its signature is the contract:
// no API route, no client fetch library, the return type is the client's type.
export async function findUnansweredAsks(whatYouKnow: string): Promise<Search> {
  return findAsks(whatYouKnow, 5);
}
