import hypercore from 'hypercore'
import randomAccessMemory from 'random-access-memory'
import earthquakes from './earthquake_fixtures.json'

export const createCore = () => hypercore(randomAccessMemory)

export const getEarthquakes = () => earthquakes