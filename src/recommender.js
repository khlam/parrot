const {PythonShell} = require('python-shell')

const ytdl = require('ytdl-core')

const usetube = require('usetube')

const mix_data = new Map()

async function parse_from_yt(url) {
    try{
        const meta_data = await ytdl.getInfo(url)

        if (("videoDetails" in meta_data) && ("media" in meta_data.videoDetails) && ("song" in meta_data.videoDetails.media) && ("artist" in meta_data.videoDetails.media)){
            console.log("URL parsed: ", meta_data.videoDetails.media)
            return {
                "track": meta_data.videoDetails.media.song,
                "artist": meta_data.videoDetails.media.artist
            }
        }
    }catch(e){
        console.log(e)
        return false
    }
    return false
}

async function search_yt(songObj) {
    const query = `${songObj.name} by ${songObj.artists}`
    console.log("MIX SEARCHING YT FOR:", query)
    const result = await usetube.searchVideo(query)
    try{
        let result_id = result.videos[0].id
        return `https://www.youtube.com/watch?v=${result_id}`
    }catch(e){
        return false
    }

}

function get_mix_size() {
    return mix_data.size
}

function song_in_mix(song_name) {
    return mix_data.has(song_name)
}
 
function pretty_print_song_list(highlight_last=false) {
    let result = "__Mix Seed Songs__"
    let i = 1
    let mark = "\n"
    
    mix_data.forEach(song => {
        result += `${mark}\t **#${i}** \t *${song.track}* \t ${song.artist}`
        i += 1
    })

    return result
}

function reset_song_list() {
    mix_data.clear()
    console.log("MIX: Song list reset")
    return
}

async function add_song(options) {
    console.log("MIX NEW SONG:", options)
    mix_data.set(options.track, options)
    return
}

function export_to_string(arr) {
    let str = ""
    arr.forEach(song => {
        let _s = JSON.stringify(song)
        str += _s
        str += "|" // pipe delim.
    })
    return str
}

function call_python_recommender() {
    return new Promise(function(resolve, reject) {
        const input = "'" + export_to_string(mix_data) + "'"
        console.log("input", input)
        let options = {
            mode: 'text',
            scriptPath: "/app/src/python/song_similarity/",
            args: ['--input', input]
        }
        
        PythonShell.run('main.py', options, function (err, results) {
            if (Array.isArray(results) === true) {
                try{
                    const recommendations = JSON.parse(results[0])
                    console.log(">", recommendations)
                    return resolve(recommendations)
                } catch(e){
                    console.log(e)
                    return resolve(false)
                }
            }
            return resolve(false)
        })
    })
}

module.exports = {
    parse_from_yt,
    call_python_recommender,
    search_yt,
    get_mix_size,
    reset_song_list,
    song_in_mix,
    pretty_print_song_list,
    add_song
}