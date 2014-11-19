var fs = require('fs');

function appendLog(status, time_stamp, build_number, browser) {
  var log_stamp = { "Time" : time_stamp,
                    "Build" : build_number,
                    "Browser" : browser,
                    "Fail" : status.fail_count,
                    "Pass" : status.pass_count,
                    "Error" : status.error_count,
                    "N/A" : status.na_count,
                    "Resolved" : status.resolved_count  }

  var old_executions  = fs.readFileSync('executions.json', 'utf-8');
  var new_executions  = JSON.parse(old_executions);
  new_executions.log.unshift(log_stamp);

  fs.writeFile('executions.json', JSON.stringify(new_executions), function(err) {
    if (err) console.log('Error appending last run to executions.json ' + err);
  });
}


function editLogEntry() {
  var old_executions  = fs.readFileSync('executions.json', 'utf-8');
  var new_executions  = JSON.parse(old_executions);

  new_executions.log[0].Resolved++;
  new_executions.log[0].Fail--;

  fs.writeFile('executions.json', JSON.stringify(new_executions), function(err) {
    if (err) console.log('Error updating last entry in executions.json ' + err);
  });
}


module.exports.appendLog      = appendLog;
module.exports.editLogEntry   = editLogEntry;
