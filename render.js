var fs    = require('fs');
var swig  = require('swig');

function render(res, time, build, status) {
  return swig.renderFile(__dirname + '/views/template.html', {
    results:  res,
    time:     time,
    build:    build,
    status:   status
  });
}

module.exports.render = render;
