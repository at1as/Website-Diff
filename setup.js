var fs  = require('fs');


function createDir(directory) {
   if (!fs.existsSync(directory)){
     fs.mkdirSync(directory, 0766, function(err){
       if(err) { console.log(err); }
     });
   }
}

function createFile(filename) {
  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, '', function(err){
      if(err) { console.log(err); }
    });
  }
}

function createDirs() {
  createDir('screenshots');
  createDir('screenshots/new');
  createDir('screenshots/old');
  createDir('screenshots/results');
}

function createFiles() {
  createFile('executions.log');
}

module.exports.directory    = createDir;
module.exports.file         = createFile;

module.exports.directories  = createDirs;
module.exports.files        = createFiles;
