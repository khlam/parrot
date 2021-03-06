// src: https://www.npmjs.com/package/@koenie06/discord.js-music?activeTab=readme
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const eventEmitter = require('events');
const activeSongs = new Map();
const event = new eventEmitter();
//const { createReadStream } = require('fs')

module.exports.event = event;

exports.play = async (options = {}) => {

    const { interaction, channel, songObj} = options;
    if(!channel || channel?.type !== 'GUILD_VOICE') {
        return {queue_len: 0, err: "ERROR: Failed to join Requestor Voice Channel"}
    }

    if(!interaction) {
        return {queue_len: 0, err: "ERROR: Interaction error"}
    }

    const data = activeSongs.get(channel.guild.id) || {};

    if(!channel.guild.me.voice.channel) {
        data.connection = await connectToChannel(channel);
    };
    if(!data.connection) {
        data.connection = await connectToChannel(channel);
    };

    if(!data.queue) data.queue = [];
    if(!data.repeat) data.repeat = false;


    data.guildId = channel.guild.id;

    let queueSongInfo;

    queueSongInfo = {
        title: songObj.name,
        duration: songObj.length,
        url: songObj.address,
        type: songObj.type,
        extra: {
            type: 'video',
            playlist: null
        }
    };

    await data.queue.push({
        info: queueSongInfo,
        requester: interaction.user,
        url: songObj.address,
        channel: interaction.channel
    });

    if(!data.dispatcher) {

        playSong(data, interaction);

    } else {

        if(queueSongInfo.extra.type === 'playlist') {
            event.emit('addList', interaction.channel, queueSongInfo.extra.playlist, interaction.user);
        } else {
            event.emit('addSong', interaction.channel, queueSongInfo, interaction.user);
        }

    };

    activeSongs.set(channel.guild.id, data);
    return {queue_len: data.queue.length, err: null}
};

exports.isConnected = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)
    try{
        const fetchedData = activeSongs.get(interaction.guild.id);

        if(!fetchedData?.connection && !fetchedData?.player) {
            return Boolean(false)
        }else {
            return Boolean(true)
        }
    }catch(e){
        return false
    }
};

exports.stop = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    /*
    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) {
        return false
    }*/
    try{
        const fetchedData = await activeSongs.get(interaction.guild.id);

        fetchedData.player.stop();
        fetchedData.connection.destroy();
        activeSongs.delete(interaction.guild.id);

        console.log("LEAVING VOICE CHANNEL")
        return true
    }catch(e){
        console.log("FAILED TO LEAVE VOICE", e)
        return false
    }
};

/*
exports.repeat = async(options = {}) => {

    const { interaction, value } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`);
    if(!value) value === false;
    if(value === undefined || typeof value !== 'boolean') throw new Error(`INVALID_BOOLEAN: There is no valid Boolean provided.`);

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = await activeSongs.get(interaction.guild.id);

    if(fetchedData?.repeat === value) throw new Error(`ALREADY_(UN)REPEATED: The song is already unrepeated / on repeat, check this with the isRepeated() function.`)

    fetchedData.repeat = value;
    activeSongs.set(interaction.guild.id, fetchedData);

}*/

exports.isRepeated = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = activeSongs.get(interaction.guild.id);

    return Boolean(fetchedData.repeat);

}

exports.skip = async(options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    //if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);
    try {
        const fetchedData = await activeSongs.get(interaction.guild.id);
        const player = await fetchedData.player;
        const connection = await fetchedData.connection
    
        const finishChannel = await fetchedData.queue[0].channel

        console.log("SKIP: ", fetchedData.queue[0].info)
        const skipped_title = fetchedData.queue[0].info.title
        await fetchedData.queue.shift();
        
        if(fetchedData.queue.length > 0) {
    
            activeSongs.set(interaction.guild.id, fetchedData);
    
            playSong(fetchedData, interaction)
    
        } else {
    
            await event.emit('finish', finishChannel);
            await activeSongs.delete(interaction.guild.id);
    
            await player.stop();
            await connection.destroy();
    
        };

        return skipped_title

    } catch(e) {}
};

exports.pause = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = activeSongs.get(interaction.guild.id);
    const player = fetchedData.player;

    if(player.state.status === 'paused') throw new Error(`ALREADY_PAUSED: The song is already paused, check this with the isPaused() function.`)

    player.pause();

}

exports.isPaused = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = activeSongs.get(interaction.guild.id);
    const player = fetchedData.player;

    if(player.state.status === 'paused') return Boolean(true)
    else return Boolean(false)

}

exports.resume = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = activeSongs.get(interaction.guild.id);
    const player = fetchedData.player;

    if(player.state.status === 'playing') throw new Error(`ALREADY_RESUMED: The song is already playing, check this with the isResumed() function.`)

    player.unpause();

}

exports.isResumed = async (options = {}) => {

    const { interaction } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`)

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = activeSongs.get(interaction.guild.id);
    const player = fetchedData.player;

    if(player.state.status === 'playing') return Boolean(true)
    else return Boolean(false)

}

exports.jump = async (options = {}) => {

    const { interaction, number } = options
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`);
    if(!number || !Number.isInteger(number)) throw new Error('INVALID_NUMBER: There is no valid Number provided.');

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = await activeSongs.get(interaction.guild.id);

    if(number > fetchedData.queue.length) throw new Error(`TO_HIGH_NUMBER: The number is higher than the queue length.`);

    await fetchedData.queue.splice(0, number);
    activeSongs.set(interaction.guild.id, fetchedData);

    playSong(activeSongs.get(interaction.guild.id), interaction);

}

exports.getQueue = async (options = {}) => {

    const { interaction } = options
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`);
    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = await activeSongs.get(interaction.guild.id);

    return (fetchedData.queue);

};

exports.removeQueue = async (options = {}) => {

    const { interaction, number } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`);
    if(!number || !Number.isInteger(number)) throw new Error(`INVALID_NUMBER: There is no valid Number provided.`);

    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = await activeSongs.get(interaction.guild.id);
    if(fetchedData.queue.length < number) throw new Error(`TO_HIGH_NUMBER: The number is higher than the queue length.`);

    const spliceNumber = number - 1;
    fetchedData.queue.splice(spliceNumber,1);

};

exports.volume = async (options = {}) => {

    const { interaction, volume } = options;
    if(!interaction) throw new Error(`INVALID_INTERACTION: There is no valid CommandInteraction provided.`);
    if(!volume || !Number.isInteger(volume) || volume > 100) throw new Error(`INVALID_VOLUME: There is no valid Volume Integer provided or the number is higher than 100.`);
    if(!activeSongs.has(interaction.guild.id) || !activeSongs.get(interaction.guild.id)?.connection || !activeSongs.get(interaction.guild.id)?.player) throw new Error(`NO_MUSIC: There is no music playing in that server.`);

    const fetchedData = await activeSongs.get(interaction.guild.id);

    fetchedData.resource.volume.setVolume(volume)

};

async function playSong(data, interaction) {
    let resource = null
    if (data.queue[0].info.type === 'yt') {
        resource = await createAudioResource(ytdl(data.queue[0].url, { filter: 'audioonly', highWaterMark: 1<<25}), { 
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });

        resource.volume.setVolume(0.4)

    }else if (data.queue[0].info.type === 'tts') {
        resource = await createAudioResource(data.queue[0].url, { // inline volume seems to cause playback problem with fetch from discord.
            inputType: StreamType.Arbitrary
        })
    }

    const player = createAudioPlayer();

    player.play(resource);

    data.player = player;
    data.resource = resource
    data.dispatcher = await data.connection.subscribe(player);
    data.dispatcher.guildId = data.guildId;

    if(data.queue[0].info.extra.type === 'playlist') {
        event.emit('playList', data.queue[0].channel, data.queue[0].info.extra.playlist, data.queue[0].info, data.queue[0].requester);
    } else {
        event.emit('playSong', data.queue[0].channel, data.queue[0].info, data.queue[0].requester);
    }

    console.log("NOW PLAYING: ", data.queue[0].info)

    player.on(AudioPlayerStatus.Idle, async () => {

        finishedSong(player, data.connection, data.dispatcher, interaction);

    })

    player.on('error', err => console.log(err))

};

async function finishedSong(player, connection, dispatcher, interaction) {

    const fetchedData = await activeSongs.get(dispatcher.guildId);

    if(fetchedData?.repeat === true) return playSong(fetchedData, interaction)

    await fetchedData.queue.shift();

    if(fetchedData.queue.length > 0) {

        activeSongs.set(dispatcher.guildId, fetchedData);

        playSong(fetchedData, interaction)

    } else {

        event.emit('finish', interaction.channel);

        activeSongs.delete(dispatcher.guildId);

        player.stop();
        connection.destroy();

    };

};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function connectToChannel(channel) {
    return new Promise(async(resolve, reject) => {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false
        });
        connection.once(VoiceConnectionStatus.Ready, () => {
            resolve(connection)
        })
        await delay(30000)
        reject('Connection was failed to connect to VC')
    })
}
