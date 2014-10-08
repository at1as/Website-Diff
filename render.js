var fs    = require('fs');
var swig  = require('swig');

function render(res, time) {
  return swig.renderFile(__dirname + '/template.html', {
    results: res,
    time: time
  });
}

module.exports.render = render;
