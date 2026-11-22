import { describe, expect, it } from 'vitest'
import { isLowEndDevice } from './deviceTier'

const nav = (values: { hardwareConcurrency?: number; deviceMemory?: number }) => values as unknown as Navigator

describe('isLowEndDevice', () => {
  it('pocos núcleos o poca memoria: equipo modesto', () => {
    expect(isLowEndDevice(nav({ hardwareConcurrency: 4 }))).toBe(true)
    expect(isLowEndDevice(nav({ hardwareConcurrency: 8, deviceMemory: 2 }))).toBe(true)
  })
  it('sin señales o con señales altas: equipo normal', () => {
    expect(isLowEndDevice(nav({}))).toBe(false)
    expect(isLowEndDevice(nav({ hardwareConcurrency: 8, deviceMemory: 8 }))).toBe(false)
  })
})
