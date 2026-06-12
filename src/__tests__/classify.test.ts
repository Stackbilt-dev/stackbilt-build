import { describe, expect, it } from 'vitest';
import { classifyScaffoldIntention } from '../commands/classify.js';

describe('classifyScaffoldIntention', () => {
  it('returns a pattern for a workers-saas intention', () => {
    const r = classifyScaffoldIntention('multi-tenant SaaS API with Stripe billing');
    expect(r.pattern).toBeTruthy();
    expect(typeof r.pattern).toBe('string');
  });

  it('returns mcp-server pattern for MCP server intentions', () => {
    const r = classifyScaffoldIntention('MCP server exposing tool endpoints for LLM agents');
    expect(r.pattern).toBe('mcp-server');
  });

  it('returns a valid pattern for queue intentions', () => {
    // charter#221: package may classify queue-consumer as 'api' until pattern vocab is aligned
    const r = classifyScaffoldIntention('Queue consumer for background job processing');
    expect(typeof r.pattern).toBe('string');
    expect(r.pattern.length).toBeGreaterThan(0);
  });

  it('returns scheduled pattern for cron worker intentions', () => {
    const r = classifyScaffoldIntention('Scheduled cron worker for daily digest emails');
    expect(r.pattern).toBe('scheduled');
  });

  it('returns a numeric confidence between 0 and 1', () => {
    const r = classifyScaffoldIntention('REST API with D1 database');
    expect(typeof r.confidence).toBe('number');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('returns lower confidence for a bare single-word intention', () => {
    const full = classifyScaffoldIntention('multi-tenant SaaS API with Stripe billing and JWT auth');
    const bare = classifyScaffoldIntention('api');
    expect(bare.confidence).toBeLessThan(full.confidence);
  });

  it('traits is a flat string array', () => {
    const r = classifyScaffoldIntention('REST API with JWT authentication and D1 database');
    expect(Array.isArray(r.traits)).toBe(true);
  });

  it('detects authentication in quality profile', () => {
    const r = classifyScaffoldIntention('REST API with JWT authentication');
    expect(r.qualityProfile.authentication).toBe(true);
  });

  it('detects durable-object pattern for collaborative/realtime intentions', () => {
    const r = classifyScaffoldIntention('Realtime collaborative whiteboard with WebSockets and Durable Objects');
    expect(r.pattern).toBe('durable-object');
  });

  it('qualityProfile has expected boolean fields', () => {
    const r = classifyScaffoldIntention('REST API with rate limiting and observability');
    expect(typeof r.qualityProfile.authentication).toBe('boolean');
    expect(typeof r.qualityProfile.rateLimiting).toBe('boolean');
    expect(typeof r.qualityProfile.observability).toBe('boolean');
    expect(typeof r.qualityProfile.piiHandling).toBe('boolean');
    expect(Array.isArray(r.qualityProfile.complianceDomains)).toBe(true);
  });

  it('produces json-serialisable output', () => {
    const r = classifyScaffoldIntention('Workers API with D1 and JWT auth');
    const json = JSON.parse(JSON.stringify(r));
    expect(typeof json.pattern).toBe('string');
    expect(typeof json.confidence).toBe('number');
    expect(Array.isArray(json.traits)).toBe(true);
    expect(json.qualityProfile).toBeTruthy();
  });
});
