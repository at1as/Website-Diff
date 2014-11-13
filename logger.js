var fs = require('fs');

function appendLog(status, time_stamp, build_number, browser) {
  var log_stamp =   'Time : ' + time_stamp +
                    '\nBuild : ' + build_number +
                    '\nBrowser : ' + browser +
                    '\nFail : ' + status.fail_count +
                    '\nPass : ' + status.pass_count +
                    '\nError : ' + status.error_count +
                    '\nN/A : ' + status.na_count +
                    '\nResolved : ' + status.resolved_count +
                    '\n-----';

  fs.appendFile('executions.log', log_stamp + '\n', function (err) {
    if (err) console.log('Error appending version to execution log ' + err);
  });
}

module.exports.appendLog = appendLog;
