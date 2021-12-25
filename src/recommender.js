const {PythonShell} = require('python-shell')
const usetube = require('usetube')

let song_list = []

async function search_yt(songObj) {
    const query = `${songObj.name} by ${songObj.artists}`
    const result = await usetube.searchVideo(query)
    try{
        let result_id = result.videos[0].id
        return `https://www.youtube.com/watch?v=${result_id}`
    }catch(e){
        return false
    }

}

function already_in_song_list(song_name) {
    song_list.forEach(song => {
        if (song.title === song_name) {
            return true
        }
    })

    return false
}
 
function pretty_print_song_list(highlight_last=false) {
    let result = ""
    let i = 1
    let mark = "\n"
    
    song_list.forEach(song => {
        result += `${mark}\t **#${i}** *${song.track}*\t${song.year}\t${song.artist}`
        i += 1
    })

    return result
}

function get_song_list() {
    return song_list
}

function reset_song_list() {
    song_list = []
    console.log("MIX: Song list reset")
    return
}

function add_song(options) {
    console.log("MIX:", options)
    song_list.push(options)
    return true
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

function call_python_recommender(song_obj_array) {
    return new Promise(function(resolve, reject) {
        const input = "'" + export_to_string(song_obj_array) + "'"
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
                    //console.log(">", recommendations)
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
    call_python_recommender,
    search_yt,
    get_song_list,
    reset_song_list,
    already_in_song_list,
    pretty_print_song_list,
    add_song
}