const { Client, Intents } = require('discord.js')

const s = require('./src/sanitizer')
const voice = require('./src/voice')
const music = require('./src/music')
const yt = require('./src/ytplayer')

const client = new Client({ intents: [Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES, // read messages
    Intents.FLAGS.GUILD_VOICE_STATES // voice connection
] })

const prefix = "-"

let command = null

let voice_connection
let voice_channel

let guild_id

async function connect_to_voice(msg) {
    voice_channel = msg.member.voice.channel
    guild_id = voice_channel.guild.id
    if (voice_channel) {
        voice_connection = await voice.connect_to_channel(msg.member.voice.channel)
        if (voice_connection) {
            console.log("Joined Voice Channel", voice_channel.name, guild_id)
        }else {
            msg.reply("ERROR: Could not connect to voice channel.")
        }
    }
}

async function execute(cmd, msg){
    return new Promise(async(resolve, reject) => {
        let result = false
        
        cmd = cmd.split(" ")

        cmd_header = cmd[0].replace(prefix, "")

        cmd = cmd[cmd.length - 1]

        if ((cmd_header === "p") || (cmd_header === "play")) {
            let _ytObj = await yt.get_youtube_obj(cmd)
            console.log("here")
            if (_ytObj !== false) {
                music.play({
                    interaction: msg,
                    channel: msg.member.voice.channel,
                    song: _ytObj.address
                })
                msg.channel.send(`*${_ytObj.name}*\t \`${_ytObj.length}\``)
            }
        }else if ( (cmd_header === "s") || cmd_header === "skip") {
            music.skip({
                interaction: msg
            })
        }
        resolve(result)
    })
}

client.login(process.env.TOKEN)

client.once('ready', () => {
	console.log('Ready!')
})

client.on("messageCreate", async (msg) => {
    if (msg.content.startsWith(prefix)) {
        console.log("o > '", msg.content, "'")
        
        command = msg.content
        
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