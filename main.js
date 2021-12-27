const { Client, Intents, Constants } = require('discord.js')

const music = require('./src/music')
const yt = require('./src/yt_obj')
const python = require('./src/python')
const helper = require('./src/helper')
const r = require('./src/recommender')

let disable_tts_all = false
let disable_tts_da = false
let disable_tts_mr = false

let last_interaction = null

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

if ('DISABLE_TTS_ALL' in process.env) {
    disable_tts_all = true
    console.log("ALL TTS DISABLED")
}

if ('DISABLE_TTS_DA' in process.env) {
    disable_tts_da = true
    console.log("Sir David Attenborough TTS DISABLED")
}

if ('DISABLE_TTS_MR' in process.env) {
    disable_tts_mr = true
    console.log("Michael Rosen TTS DISABLED")
}

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
                    description: 'YouTube video URL',
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
                    description: 'Voice Select: 0 = LJ Speech; 1 = David Attenborough; 2 = Michael Rosen',
                    required: true,
                    choices: [
                        {
                            "name": "LJ Speech",
                            "value": 0
                        },
                        {
                            "name": "David Attenborough",
                            "value": 1
                        },
                        {
                            "name": "Michael Rosen",
                            "value": 2
                        }
                    ],
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
        /*
        commands?.create({
            name: 'mix',
            description: 'Dynamic music recommendation given a list of songs.',
            options: [
                {
                    name: "url",
                    description: 'YouTube URL. Must be a music video.',
                    type: Constants.ApplicationCommandOptionTypes.STRING
                },
                {
                    name: "start",
                    description: 'Start the mix with the given seed songs.',
                    type: 2,
                },
                {
                    name: "reset",
                    description: 'Clear and reset seed song list.',
                    type: 2,
                }
            ]
        })*/

        commands?.create({
            name: "mix",
            description: "Dynamic music recommendation given a list of songs.",
            options: [
                {
                    name: "add",
                    description: "YouTube URL. Must be a music video.",
                    type: 1,
                    options: [
                        {
                            name: "url",
                            description: "YouTube URL. Must be a music video.",
                            type: Constants.ApplicationCommandOptionTypes.STRING,
                            required: true
                        },
                    ]
                },
                {
                    name: "start",
                    description: "Start the mix with the given seed songs.",
                    type: 1
                },
                {
                    name: "reset",
                    description: "Clear and reset seed song list.",
                    type: 1
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
                interaction.reply({
                    content: `ERROR: Failed to Join Requestor Voice Channel`,
                    ephemeral: true
                })
            }
        }else {
            interaction.reply({
                content: `ERROR: Invalid Youtube URL`,
                ephemeral: true
            })
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
            r.reset_song_list()
            
            const _r = await music.stop({
                interaction: interaction
            })

            if (_r === true) {
                await interaction.reply({content: `Leaving voice channel.`})
            }else {
                await interaction.reply({
                    content: `ERROR: Cannot leave voice channel.`,
                    ephemeral: true
                })
            }
            
        } catch(e){}
    }

    else if (commandName === "speak") {
        if (disable_tts_all === false) {
            const voice = options.getNumber('voice')
            const text = options.getString('text')
            const out_id = `${helper.randint(1111, 9999)}.${interaction.user.discriminator}.${new Date(new Date()-3600*1000*3).toISOString()}`
            
            let name = ""
    
            await interaction.deferReply({ephemeral: true})
    
            console.log("STARTING TTS INFERENCE ON TEXT: ", text)
            console.log("out_id:", out_id)
            //console.time('inference')
    
            let inf_success = false
    
            switch(voice) {
                case 0: // voice = 0, FastSpeech2
                    inf_success = await python.fastspeech2(text, out_id)
                    name = "LJ Speech"
                    break;
    
                case 1: // voice = 1, David Attenborough
                    if (disable_tts_da === false) {
                        inf_success = await python.tactron2(text, 1, out_id)
                        name = "David Attenborough"
                    }else {
                        await interaction.editReply({
                            content: `Error: Sir David Attenborough TTS disabled.`,
                            ephemeral: true
                        })
                        return
                    }
                    break;
    
                case 2: // voice = 2, Michael Rosen
                    if (disable_tts_mr === false) {
                        inf_success = await python.tactron2(text, 2, out_id)
                        name = "Michael Rosen"
                    }else {
                        await interaction.editReply({
                            content: `Error: Michael Rosen TTS disabled.`,
                            ephemeral: true
                        })
                        return
                    }
                    break;
    
                default:
                    await interaction.editReply({
                        content: `Error: Invalid voice selection \`${voice}\`.`,
                        ephemeral: true
                    })
                    return
            }
    
            //console.timeEnd('inference')
    
            if (inf_success === true){ // if result of calling python script ends in '<xxxx>.wav SUCCESS' then wav file was created
                await helper.upload_wav(interaction, text, music, name, out_id)
            }else { // otherwise the python did not succeed
                await interaction.editReply({
                    content: `Error: Sentence may be too long. Please rephrase text and try again.`,
                    ephemeral: true
                })
                return
            }
        }else{
            await interaction.reply({
                content: `Error: All TTS options are disabled.`,
                ephemeral: true
            })
            return
        }
    }
    else if (commandName === "mix") {
        if (interaction.options.getSubcommand() === "add") { // add song to seed list

            const url = options.getString('url')

            console.log("mix: url", url)

            if (url !== null) {
                const _res = await r.parse_from_yt(url)

                if (_res === false) {
                    await interaction.reply({
                        content:`ERROR: Could not parse song or artist info from URL.`,
                        ephemeral: true
                    })
                    return
                }else {
                    if (r.song_in_mix(_res.track) === false) {
                        await r.add_song({
                            track: _res.track,
                            artist: _res.artist
                        })
                        await interaction.reply({
                            content:`${r.pretty_print_song_list(true)}`,
                            ephemeral: false
                        })
                        return
                    }else {
                        await interaction.reply({
                            content:`Song \`${_res.track}\` already in list.`,
                            ephemeral: true
                        })
                        return
                    }
                }
            }else {
                await interaction.reply({
                    content:`ERROR: Missing song youtube url.`,
                    ephemeral: true
                })
                return
            }            
        }

        else if (interaction.options.getSubcommand() === "start") { // start the mix
            console.log("MIX: Starting mix...")
            
            if (r.get_mix_size() >= 1) { // start mix if there is atleast 1 seed song
                await interaction.reply({
                    content:`> Starting Mix with the following seed songs ${r.pretty_print_song_list(true)}`,
                    ephemeral: false
                })

                let song_list = await r.call_python_recommender()
                
                let started_adding_mix = false
                last_interaction = Object.assign({}, interaction)

                if (song_list !== false) {
                    for (const song of song_list) {
                        if ((music.isConnected({interaction: last_interaction}) === true) || (started_adding_mix === false)) {
                            started_adding_mix = true
                            let _song_url = await r.search_yt(song)
    
                            if (_song_url !== false) {
                                let _ytObj = await yt.get_youtube_obj(_song_url)
                                if (_ytObj !== false) {
                                    try {
                        
                                        let play_result =  await music.play({
                                            interaction: interaction,
                                            channel: interaction.member.voice.channel,
                                            songObj: _ytObj,
                                        })
                                
                                        if (play_result.err === null) {
                                            await interaction.channel.send({
                                                content: `**#${play_result.queue_len}** \t *${_ytObj.name}*\t \`${_ytObj.length}\` \t [Link (YouTube) 🔗](${_ytObj.address})`
                                            })
                                        }
        
                                    } catch(e) {
                                        console.log(e)
                                    }
                                }
                            }
                        }else {
                            r.reset_song_list()
                            await interaction.channel.send({ // tell user seed list is empty
                                content:`ERROR: Not connected to voice channel. Clearing mix.`,
                                ephemeral: false
                            })
                            last_interaction = null
                            return
                        }
                    }
                    last_interaction = null
                    r.reset_song_list() // reset mix seed list
                    return
                }else {
                    await interaction.channel.send({ // tell user seed list is empty
                        content:`ERROR: Insufficient seed songs, please try again.`,
                        ephemeral: false
                    })
                }
            }else {
                await interaction.reply({ // tell user seed list is empty
                    content:`ERROR: Cannot start mix from empty seed song list.`,
                    ephemeral: true
                })
            }
        }

        else if (interaction.options.getSubcommand() === "reset") { // reset mix seed list
            r.reset_song_list()
            await interaction.reply({
                content:`Mix seed song list reset.`,
                ephemeral: false
            })
        }
        return
    }
})

client.login(process.env.TOKEN)

process.once('SIGTERM', function () {
    console.log('SIGTERM. Shutting down.')
    process.exit()
})