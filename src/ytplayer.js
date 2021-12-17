const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// src: https://www.npmjs.com/package/@koenie06/discord.js-music
async function connect_to_channel(channel) {
    return new Promise(async(resolve, reject) => {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false
        })

        connection.once(VoiceConnectionStatus.Ready, () => {
            console.log("Connected to voice channel '", channel.name, "'")
            resolve(connection)
        })

        await delay(3000)
        reject('Connection timeout')
    })
}

module.exports = {
    connect_to_channel
}