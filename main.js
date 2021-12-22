const { Client, Intents, Constants } = require('discord.js')

const music = require('./src/music')
const yt = require('./src/yt_obj')
const python = require('./src/python')

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES // voice connection
    ]
})

client.once('ready', () => {
    const _all_guilds = client.guilds.cache.map(guild => guild.id)
    if (_all_guilds.length === 1) {
        const guild_id = _all_guilds[0]
        const guild = client.guilds.cache.get(guild_id)
        let commands

        console.log("Bot is now ready for guild", guild_id)

        if (guild) {
            commands = guild.commands
        }else {
            commands = client.application?.commands // global
        }

        commands?.create({
            name: 'play',
            description: 'Play audio from a YouTube video.',
            options: [
                {
                    name: 'url',
                    description: 'URL of YouTube video to be played',
                    required: true,
                    type: Constants.ApplicationCommandOptionTypes.STRING
                }
            ]
        })

        commands?.create({
            name: 'skip',
            description: 'Skip currently playing.'
        })

        commands?.create({
            name: 'leave',
            description: 'Tells bot to leave the voice channel.'
        })

        commands?.create({
            name: 'speak',
            description: 'Call FastSpeech2 Model to Transcribe TTS.',
            options: [
                {
                    name: 'text',
                    description: 'Text to be transcribed',
                    required: true,
                    type: Constants.ApplicationCommandOptionTypes.STRING
                }
            ]
        })

    }else {
        console.log("ERROR: Bot has not been added to a guild or belongs to more than 1 guild. System is not tested for serving multiple discord servers.")
        process.exit()
    }
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return
    }
    
    const {commandName, options} = interaction

    if (commandName === "play") {
        let _ytObj = await yt.get_youtube_obj(options.getString('url'))

        if (_ytObj !== false) {
            try {
                let queue_len = await music.play({
                    interaction: interaction,
                    channel: interaction.member.voice.channel,
                    songObj: _ytObj,
                })
                interaction.reply(`**#${queue_len}** \t *${_ytObj.name}*\t \`${_ytObj.length}\` \t [Link (YouTube) 🔗](${_ytObj.address})`)
            } catch(e) {
                interaction.reply({content: `ERROR: Failed to Join Requestor Voice Channel`})
            }
        }else {
            interaction.reply({content: `ERROR: Invalid Youtube URL`})
        }
    }

    else if (commandName === "skip") {
        await interaction.reply({content: `200`});
        await interaction.deleteReply();
        music.skip({
            interaction: interaction
        })
    }
    
    else if (commandName === "leave") {
        try{
            await interaction.reply({content: `200`});
            await interaction.deleteReply();
            music.stop({
                interaction: interaction
            })
        } catch(e){}
    }

    else if (commandName === "speak") {
        const text = options.getString('text')
        
        console.log("STARTING TTS INF ON TEXT: ", text)

        await interaction.deferReply({})

        console.time('inference')
        
        await python.fastspeech2(text) // call inference on tts

        console.timeEnd('inference')

        const res = await interaction.editReply({ // upload wav file to discord and get url of file
            content: `working...`,
            files: ["/tmp/out.wav"] 
        })
        
        ttsObj = {
            name: text,
            length: "00:00:00",
            type: "file",
            address: res.attachments.values().next().value['url'] // url of wav file we just uploaded
        }

        let queue_len =  await music.play({
            interaction: interaction,
            channel: interaction.member.voice.channel,
            songObj: ttsObj,
        })
        await interaction.editReply({
            content:  `**#${queue_len}** \t *${ttsObj.name}*\t \t [Link (Discord) 🔗](${ttsObj.address})`
        })
    }

})

client.login(process.env.TOKEN)

process.once('SIGTERM', function () {
    console.log('SIGTERM. Shutting down.')
    process.exit()
})