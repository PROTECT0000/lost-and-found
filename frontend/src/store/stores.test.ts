import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemStore } from './useItemStore'
import { selectIsAdmin, useAuthStore } from './useAuthStore'

describe('useItemStore filters', () => {
  beforeEach(() => {
    useItemStore.getState().resetFilters()
  })

  it('goes back to page 1 when any filter other than page changes', () => {
    const { setFilters } = useItemStore.getState()
    setFilters({ page: 3 })
    setFilters({ type: 'lost' })
    expect(useItemStore.getState().filters).toMatchObject({ page: 1, type: 'lost' })
  })

  it('keeps the page when the page itself changes', () => {
    useItemStore.getState().setFilters({ type: 'found', page: 4 })
    expect(useItemStore.getState().filters).toMatchObject({ page: 4, type: 'found' })
  })

  it('keeps existing filters when adding another', () => {
    const { setFilters } = useItemStore.getState()
    setFilters({ type: 'lost' })
    setFilters({ category: 'keys' })
    expect(useItemStore.getState().filters).toMatchObject({ type: 'lost', category: 'keys' })
  })

  it('resetFilters restores the defaults', () => {
    const { setFilters, resetFilters } = useItemStore.getState()
    setFilters({ type: 'lost', q: 'wallet', limit: 48, page: 2 })
    resetFilters()
    expect(useItemStore.getState().filters).toEqual({ page: 1, limit: 12 })
  })
})

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
