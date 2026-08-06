import { describe, it, expect, beforeEach, vi } from 'vitest'

const state = vi.hoisted(() => ({
  service: {} as Record<string, unknown>,
}))

vi.mock('~/config/setup', () => ({
  getEsriTokenService: async () => state.service,
}))

const { fetchEsriToken } = await import('~/services/esritoken')

describe('fetchEsriToken', () => {
  beforeEach(() => {
    state.service = {
      endpoint: 'https://tokens.example/generateToken',
      username: 'user',
      password: 'secret',
      intervalMinutes: 59,
    }
  })

  it('posts the credentials and returns the parsed token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ token: 'abc', expires: 123 })
    vi.stubGlobal('$fetch', fetchMock)

    const token = await fetchEsriToken()

    expect(token).toEqual({ token: 'abc', expires: 123 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://tokens.example/generateToken',
      expect.objectContaining({
        method: 'POST',
        body: 'username=user&password=secret&expiration=59&f=json',
      }),
    )
  })

  it('caps the token expiration at 60 minutes', async () => {
    state.service.intervalMinutes = 120
    const fetchMock = vi.fn().mockResolvedValue({ token: 'abc', expires: 123 })
    vi.stubGlobal('$fetch', fetchMock)

    await fetchEsriToken()

    expect(fetchMock.mock.calls[0][1].body).toContain('expiration=60')
  })

  it('throws when the response is empty', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

    await expect(fetchEsriToken()).rejects.toThrow('Expected token as response')
  })

  it('throws with the service message when the response contains an error', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      error: { message: 'Invalid credentials' },
    }))

    await expect(fetchEsriToken()).rejects.toThrow(
      'Failed fetching token from https://tokens.example/generateToken with message: Invalid credentials',
    )
  })
})
