var fs  = require('fs');


function createDir(directory) {
   if (!fs.existsSync(directory)){
     fs.mkdirSync(directory, 0766, function(err){
       if(err) console.log(err);
     });
   }
}

function createFile(filename, content) {
  if (!fs.existsSync(filename)) {
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
  if (fs.existsSync('./browser-list.json')) {
    var browsers = JSON.parse(fs.readFileSync('./browser-list.json'));
    var browser_list = browsers.browsers;
    for(i=0; i<browser_list.length; i++){
      screensDir(browser_list[i]);
    }
  }
}

function createFiles() {
  createFile('./executions.json', JSON.stringify({"log" : []}));
  createFile('./browser-list.json', JSON.stringify({"browsers" : []}));
}

function screensDir(browser){
  createDir('./public/assets/images/screenshots/new/' + browser);
  createDir('./public/assets/images/screenshots/old/' + browser);
  createDir('./public/assets/images/screenshots/results/' + browser);
}

module.exports.directory    = createDir;
module.exports.file         = createFile;

module.exports.directories  = createDirs;
module.exports.files        = createFiles;

module.exports.screensDir   = screensDir;
