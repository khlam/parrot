const {PythonShell} = require('python-shell') // We're using python shell lib to call python script that calls pytorch

function fastspeech2(t, out_id) {
  return new Promise(function(resolve, reject) {
    let options = {
        mode: 'text',
        scriptPath: "/app/src/python/fastspeech2/",
        args: ['--text', t, '--out_id', out_id]
    }
      
    PythonShell.run('main.py', options, function (err, results) {
        console.log(">", results)
        console.log(">>", results[results.length - 1])
        if (results[results.length - 1] === `${out_id} SUCCESS`) {
          return resolve(true)
        }else {
          return resolve(false)
        }
    })
  })
}

function tactron2(t, model, out_id) { // there is a word count limit
  return new Promise(function(resolve, reject) {
    let options = {
        mode: 'text',
        scriptPath: "/app/src/python/tactron2/",
        args: ['--text', t, '--model_select', model, '--out_id', out_id]
    }
      
    PythonShell.run('main.py', options, function (err, results) {
      console.log(">", results)
      console.log(">>", results[results.length - 1])
      if (results[results.length - 1] === `${out_id} SUCCESS`) {
        return resolve(true)
      }else {
        return resolve(`${results[results.length - 1]}`)
      }
    })
  })
}

module.exports = {
    fastspeech2,
    tactron2
}