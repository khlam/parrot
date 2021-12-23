async function upload_wav(interaction, text, music) {
    console.log("\tuploading wav to discord...")
    const res = await interaction.editReply({ // upload wav file to discord and get url of file
        content: `working...`,
        files: ["/tmp/out.wav"] 
    })
    
    console.log("\t\tupload done")
    console.log(res.attachments.values().next())
    ttsObj = {
        name: text,
        length: "00:00:00",
        type: "file",
        address: res.attachments.values().next().value['proxyURL'] // url of wav file we just uploaded
    }

    let play_result =  await music.play({
        interaction: interaction,
        channel: interaction.member.voice.channel,
        songObj: ttsObj,
    })

    if (play_result.err === null) {
        await interaction.editReply({
            content: `**#${play_result.queue_len}** \t *${ttsObj.name}*\t \t [Link (Discord) 🔗](${ttsObj.address})`
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