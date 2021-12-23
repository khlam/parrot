const { Client, Intents, Constants } = require('discord.js')

const music = require('./src/music')
const yt = require('./src/yt_obj')
const python = require('./src/python')
const helper = require('./src/helper')

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
            description: 'Call a model to transcribe text.',
            options: [
                {
                    name: 'voice',
                    description: 'Voice Select: 0 = FastSpeech; 1 = David Attenborough; 2 = Michael Rosen',
                    required: true,
                    type: Constants.ApplicationCommandOptionTypes.NUMBER
                },
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

                let play_result =  await music.play({
                    interaction: interaction,
                    channel: interaction.member.voice.channel,
                    songObj: _ytObj,
                })
        
                if (play_result.err === null) {
                    await interaction.reply({
                        content: `**#${play_result.queue_len}** \t *${_ytObj.name}*\t \`${_ytObj.length}\` \t [Link (YouTube) 🔗](${_ytObj.address})`
                    })
                }

            } catch(e) {
                console.log(e)
                interaction.reply({content: `ERROR: Failed to Join Requestor Voice Channel`})
            }
        }else {
            interaction.reply({content: `ERROR: Invalid Youtube URL`})
        }
    }

    else if (commandName === "skip") {
        const skipped_title = await music.skip({
            interaction: interaction
        })
        await interaction.reply({content: `**skipped** *${skipped_title}*`})
    }
    
    else if (commandName === "leave") {
        try{
            await interaction.reply({content: `Leaving channel.`})
            music.stop({
                interaction: interaction
            })
        } catch(e){}
    }

    else if (commandName === "speak") {
        const voice = options.getNumber('voice')

        const text = options.getString('text')
        
        await interaction.deferReply({})

        console.log("STARTING TTS INFERENCE ON TEXT: ", text)
        console.time('inference') 

        if (voice === 0) { // voice = 0, fast-speech 2
            await python.fastspeech2(text)
        }
        
        else if (voice === 1) { // voice = 1, David Attenborough
            await python.tactron2(text, 1) // call inference on tts
        }

        else if (voice === 2) { // voice = 2, Michael Rosen
            await python.tactron2(text, 2) // call inference on tts
        }

        console.timeEnd('inference')

        await helper.upload_wav(interaction, text, music, voice)

    }
})

client.login(process.env.TOKEN)

process.once('SIGTERM', function () {
    console.log('SIGTERM. Shutting down.')
    process.exit()
})