const {PythonShell} = require('python-shell') // We're using python shell lib to call python script that calls pytorch

function fastspeech2(t) {
  return new Promise(function(resolve, reject) {
    let options = {
        mode: 'text',
        //pythonPath: 'path/to/python',
        //pythonOptions: ['-u'], // get print results in real-time
        scriptPath: "/app/src/python/fastspeech2/",
        args: ['--text',`${t}`]
    }
      
    PythonShell.run('main.py', options, function (err, results) {
        console.log(">", results)
        return resolve(results)
    })
  })
}

module.exports = {
    fastspeech2
}