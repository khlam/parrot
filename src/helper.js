const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const fs = require('fs')

async function upload_wav(interaction, text, music, voice) {
    console.log("\tuploading wav to discord...")
    const res = await interaction.editReply({ // upload wav file to discord and get url of file
        content: `working...`,
        files: ["/tmp/out.wav"] 
    })
    
    await delay(500)

    try {
        await fs.unlinkSync("/tmp/out.wav")
    } catch(err) {
        console.error(err)
    }

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
}

module.exports = {
    upload_wav
}