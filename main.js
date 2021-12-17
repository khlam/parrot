const { Client, Intents } = require('discord.js')

const s = require('./src/sanitizer')

const yt = require('./src/ytplayer')

const client = new Client({ intents: [Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES, // read messages
    Intents.FLAGS.GUILD_VOICE_STATES // check voice connection
] })

const prefix = "-"

let command = null

async function execute(cmd, msg){
    return new Promise(async(resolve, reject) => {
        if ((cmd.startsWith("p") === true) || cmd.startsWith("play")) {
            await yt.connect_to_channel(msg.member.voice.channel)
            resolve(true)
        }

        resolve(true)
    })
}

client.login(process.env.TOKEN)

client.once('ready', () => {
	console.log('Ready!')
})

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)) {
        console.log("o > '", msg.content, "'")
        
        command = s.sanitize(msg.content)
        
        console.log("s > '", command, "'")
        
        await execute(command, msg)
        
        command = null
        msg = null
    }else {
        msg = null
        command = null
        return
    }
})

process.once('SIGTERM', function () {
    console.log('SIGTERM. Shutting down.')
    process.exit()
})