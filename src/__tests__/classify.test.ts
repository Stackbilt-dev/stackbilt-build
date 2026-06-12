import { describe, expect, it } from 'vitest';
import { classifyScaffoldIntention } from '../commands/classify.js';

describe('classifyScaffoldIntention', () => {
  it('classifies a workers-saas intention', () => {
    const r = classifyScaffoldIntention('multi-tenant SaaS API with Stripe billing');
    expect(r.pattern).toBe('workers-saas');
    expect(r.confidence).toBe('high');
    expect(r.traits.verification).toBe('none'); // no explicit auth keyword
    expect(r.qualityProfile).toContain('tenant');
    expect(r.qualityProfile).toContain('billing');
  });

  it('classifies a discord-bot intention', () => {
    const r = classifyScaffoldIntention('Discord bot with slash commands for team standups');
    expect(r.pattern).toBe('discord-bot');
    expect(r.traits.dispatch).toBe('event-handler');
  });

  it('classifies a stripe-webhook intention', () => {
    const r = classifyScaffoldIntention('Stripe payment webhook for subscription events');
    expect(r.pattern).toBe('stripe-webhook');
    expect(r.traits.dispatch).toBe('event-handler');
  });

  it('classifies a github-webhook intention', () => {
    const r = classifyScaffoldIntention('GitHub webhook listener for pull request and issue events');
    expect(r.pattern).toBe('github-webhook');
  });

  it('classifies an mcp-server intention', () => {
    const r = classifyScaffoldIntention('MCP server exposing tool endpoints for LLM agents');
    expect(r.pattern).toBe('mcp-server');
  });

  it('classifies a queue-consumer intention', () => {
    const r = classifyScaffoldIntention('Queue consumer for background job processing');
    expect(r.pattern).toBe('queue-consumer');
    expect(r.traits.dispatch).toBe('queue-consumer');
    expect(r.traits.route_shape).toBe('event');
    expect(r.bindings).toContain('queues');
  });

  it('classifies a cron-worker intention', () => {
    const r = classifyScaffoldIntention('Scheduled cron worker for daily digest emails');
    expect(r.pattern).toBe('cron-worker');
    expect(r.traits.dispatch).toBe('cron');
    expect(r.traits.route_shape).toBe('event');
  });

  it('detects bindings from description', () => {
    const r = classifyScaffoldIntention('REST API with D1 database and R2 file uploads and KV cache');
    expect(r.bindings).toContain('d1');
    expect(r.bindings).toContain('r2');
    expect(r.bindings).toContain('kv');
  });

  it('detects jwt-auth verification', () => {
    const r = classifyScaffoldIntention('REST API with JWT authentication and D1 database');
    expect(r.traits.verification).toBe('jwt-auth');
  });

  it('detects hmac verification', () => {
    const r = classifyScaffoldIntention('Webhook handler with HMAC signature verification');
    expect(r.traits.verification).toBe('hmac');
  });

  it('assigns tier 2 for multi-feature intentions', () => {
    const r = classifyScaffoldIntention('multi-tenant SaaS API with Stripe billing and D1 database');
    expect(r.tier).toBe(2);
  });

  it('returns low confidence for a bare single-word intention', () => {
    const r = classifyScaffoldIntention('api');
    expect(r.confidence).toBe('low');
  });

  it('produces json-serialisable output', () => {
    const r = classifyScaffoldIntention('Workers API with D1 and JWT auth');
    const json = JSON.parse(JSON.stringify(r));
    expect(json.pattern).toBeTruthy();
    expect(json.confidence).toBeTruthy();
    expect(json.traits).toBeTruthy();
    expect(Array.isArray(json.bindings)).toBe(true);
  });
});
