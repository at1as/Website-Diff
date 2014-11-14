var fs  = require('fs');


function createDir(directory) {
   if (!fs.existsSync(directory)){
     fs.mkdirSync(directory, 0766, function(err){
       if(err) console.log(err);
     });
   }
}

function createFile(filename, content) {
  if (!fs.exists(filename)) {
    fs.writeFile(filename, content, function(err){
      if(err) console.log(err);
    });
  }
}

function createDirs() {
  createDir('./saved-env');
  createDir('./public/assets');
  createDir('./public/assets/images');
  createDir('./public/assets/images/screenshots');
  createDir('./public/assets/images/screenshots/new');
  createDir('./public/assets/images/screenshots/old');
  createDir('./public/assets/images/screenshots/results');
}

function createFiles() {
  createFile('executions.json', JSON.stringify({"log" : []}));
}

module.exports.directory    = createDir;
module.exports.file         = createFile;

module.exports.directories  = createDirs;
module.exports.files        = createFiles;
