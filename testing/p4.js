const { Client } = require('hyperspace')
const pt = require("process-top");
start()

async function start () {
    const c = new Client()

    const store = c.corestore()

// Core is a Hypercore instance, which is an append-only log
    const core = store.get('ecf859ab7180852b4a8676e3e475c00ffa5f5e7c983e9bf823e246f837bd3a20', { valueEncoding: 'json' })
    await core.ready()

    const mostRecentEntry = await (core.get(core.length - 1, { valueEncoding: 'utf-8' }))

    console.log(mostRecentEntry)

}
