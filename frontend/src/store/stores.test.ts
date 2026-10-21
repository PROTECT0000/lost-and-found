import { beforeEach, describe, expect, it, vi } from 'vitest'
import { selectIsAdmin, useAuthStore } from './useAuthStore'

describe('selectIsAdmin', () => {
  const now = new Date('2026-10-21T12:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers({ now })
  })

  const isAdmin = (token: string | null, expiresAt: number | null) =>
    selectIsAdmin({ ...useAuthStore.getState(), token, expiresAt })

  it('is true for an unexpired token', () => {
    expect(isAdmin('token', now + 60_000)).toBe(true)
  })

  it('is false once the token has expired', () => {
    expect(isAdmin('token', now)).toBe(false)
    expect(isAdmin('token', now - 1)).toBe(false)
  })

  it('is false without a token or expiry', () => {
    expect(isAdmin(null, now + 60_000)).toBe(false)
    expect(isAdmin('token', null)).toBe(false)
  })
})
