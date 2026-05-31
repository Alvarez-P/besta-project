/// <reference types="jest" />

import { CircuitBreaker, CircuitState } from '../../../src/shared/infrastructure/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('executes the function and returns its result', async () => {
    const breaker = new CircuitBreaker();
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('opens circuit after reaching failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const failingFn = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow('fail');
    }

    expect(breaker.currentState).toBe(CircuitState.OPEN);
  });

  it('rejects requests when circuit is OPEN', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('transitions to HALF_OPEN after resetTimeout', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(6000);

    expect(breaker.currentState).toBe(CircuitState.OPEN);

    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('goes back to OPEN if half-open request fails', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 5000 });

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(6000);

    await expect(breaker.execute(() => Promise.reject(new Error('fail again')))).rejects.toThrow('fail again');
    expect(breaker.currentState).toBe(CircuitState.OPEN);
  });

  it('resets failure count after successful execution', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');

    await breaker.execute(() => Promise.resolve('ok'));

    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });
});
