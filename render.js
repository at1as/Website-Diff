var fs    = require('fs');
var swig  = require('swig');

function render(res, time, build) {
  return swig.renderFile(__dirname + '/template.html', {
    results: res,
    time: time,
    build: build
  });
}

module.exports.render = render;
