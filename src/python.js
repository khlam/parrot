const {PythonShell} = require('python-shell') // We're using python shell lib to call python script that calls pytorch

function fastspeech2(t, out_file) {
  return new Promise(function(resolve, reject) {
    let options = {
        mode: 'text',
        scriptPath: "/app/src/python/fastspeech2/",
        args: ['--text', t, '--out_file', out_file]
    }
      
    PythonShell.run('main.py', options, function (err, results) {
        console.log(">", results)
        console.log(">>", results[results.length - 1])
        if (results[results.length - 1] === `${out_file} SUCCESS`) {
          return resolve(true)
        }else {
          return resolve(false)
        }
    })
  })
}

function tactron2(t, model, out_file) { // there is a word count limit
  return new Promise(function(resolve, reject) {
    let options = {
        mode: 'text',
        scriptPath: "/app/src/python/tactron2/",
        args: ['--text', t, '--model_select', model, '--out_file', out_file]
    }
      
    PythonShell.run('main.py', options, function (err, results) {
      console.log(">", results)
      console.log(">>", results[results.length - 1])
      if (results[results.length - 1] === `${out_file} SUCCESS`) {
        return resolve(true)
      }else {
        return resolve(false)
      }
    })
  })
}

module.exports = {
    fastspeech2,
    tactron2
}