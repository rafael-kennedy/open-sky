const { Client } = require('hyperspace')
const axios = require('axios')
const Hyperbee = require('hyperbee')
const s2 = require('@radarlabs/s2');

const defaultS2Level = 10;

start()

async function loadEarthquakes() {
    const rawQuakes = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson')

    const quakes = rawQuakes?.data?.features

    return quakes;
}

async function writeQuake(quake, db) {
    const quakesDB = db.sub('id::')
    const geospatialIndex = db.sub('geo::')

    const point = new s2.CellId(new s2.LatLng(quake.geometry.coordinates[1], quake.geometry.coordinates[0]));
    const quakeId = quake.id;
    const current = await quakesDB.get(quakeId);
    quake.properties.token = point.token()
    if (!current) {
        await quakesDB.put(quakeId, quake)
        await geospatialIndex.put(quake.properties.token + '/' + quakeId, quake)
    }

}

async function start () {
    const c = new Client()

    const store = c.corestore()

    const core = store.get('earthquakes')
    await core.ready()

    const quakes = await loadEarthquakes();

    const db = new Hyperbee(core, {
        keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
        valueEncoding: 'json' // same options as above
    })


    for (const quake of quakes) {
        await writeQuake(quake, db)
    }



    console.log('Earthquakes public key: ' + core.key.toString('hex'))
}