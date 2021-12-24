const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function upload_wav(interaction, text, music, voice, out_file) {
    console.log(`\tuploading ${out_file} to discord...`)

    const out_path = `/tmp/${out_file}`

    const res = await interaction.editReply({ // upload wav file to discord and get url of file
        content: `working...`,
        files: [`${out_path}`] 
    })
    
    await delay(500)

    console.log("\t\tupload done")

    console.log(res.attachments.values().next())
    ttsObj = {
        name: text,
        length: "00:00:00",
        type: "tts",
        address: res.attachments.values().next().value['url'] // url of wav file we just uploaded
    }

    let play_result =  await music.play({
        interaction: interaction,
        channel: interaction.member.voice.channel,
        songObj: ttsObj,
    })

    if (play_result.err === null) {
        await interaction.editReply({
            content: `**#${play_result.queue_len}** Voice: ${voice} \t *${ttsObj.name}*\t \t [Link (Discord) 🔗](${ttsObj.address})`
        })
    }else {
        await interaction.editReply({
            content: `${play_result.err}`
        })
    }
    
    return
}

function randint(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
}

module.exports = {
    upload_wav,
    randint
}