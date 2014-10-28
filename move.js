var fs = require('fs');

function new_master(curr, prev) {
  fs.rename(curr, prev, function(err) {
    if (err) console.log("Error moving captured screenshot " + err);
  });
}

module.exports.new_master = new_master;
