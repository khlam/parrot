const { Client, Intents } = require('discord.js')

const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

client.login(process.env.TOKEN)

client.once('ready', () => {
	console.log('Ready!')
})

process.once('SIGTERM', function () {
    console.log('SIGTERM. Shutting down.')
    process.exit()
})