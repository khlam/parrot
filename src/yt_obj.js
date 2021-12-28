const ytdl = require('ytdl-core')

async function get_youtube_obj(URL) {
    if(ytdl.validateURL(URL) === true) {
        try {
            let info = await ytdl.getInfo(URL)
            let _videoObj = {
                name: `${info.videoDetails.title.substring(0, 30)}...`,
                length: new Date(info.videoDetails.lengthSeconds * 1000).toISOString().substr(11, 8),
                type: "yt",
                address: URL
            }
            return _videoObj
        }catch(e) {
            console.log(`${e}`)
            let _videoObj = {
                name: `${URL.substring(5, 15)}`,
                length: "ERR",
                type: "yt",
                address: URL
            }
            return _videoObj
        }
    }else {
        return false
    }
}

module.exports = {
    get_youtube_obj
}