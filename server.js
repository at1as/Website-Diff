var express     = require('express');
var http        = require('http');
var swig        = require('swig');
var bodyParser  = require('body-parser')
var fs          = require('fs');
var mime        = require('mime');
var render      = require(__dirname + "/render");

app             = express();

var driver      = require(__dirname + '/driver.js')
var image_swap  = require(__dirname + '/move.js');


app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

port = process.env.PORT || 8080;
report_generated = false;
test_data = [];
last_config = {'browser':'chrome','width':1000,'height':1000, url:'www.google.com/', urn: 'plus'}


// Load configuration page on start
app.get('/', function (req, res) {
  //res.render('config.html', {a:'aab'});
  //res.render('output');
  res.render('template', {
    results:  test_data[0],
    time:     test_data[1],
    build:    test_data[2],
    status:   test_data[3],
    executed: report_generated
  });
});

// Report
app.get('/report', function (req, res) {
  console.log(JSON.stringify(test_data[3], null, 4));
  res.render('template', {
    results:  test_data[0],
    time:     test_data[1],
    build:    test_data[2],
    status:   test_data[3],
    executed: report_generated
  });
});


// Set failed test to new master
app.post('/master', function (req, res) {
  previous  = 'public' + req.body.previous;
  current   = 'public' + req.body.current;
  index     = req.body.index - 1;

  image_swap.new_master(current, previous);

  // Update Prior Test Data
  test_data[0][index]['result'] = "RESOLVED";
  test_data[3].fail_count -= 1;
  test_data[3].resolved_count += 1;

  // TODO : Update Log Entries
  res.status(200).end();
});


// Load configuration page
app.get('/config', function (req, res) {
  res.render('config', { config: last_config });
});


// Execute a new test
app.post('/execute', function (req, res) {
  last_config = req.body;
  build = req.body.build;

  driver.run(build, function(done){

    test_data = done || [];
    console.log('r[0] : ' + JSON.stringify(done[0], null, 4));
    console.log('r[1] : ' + done[1]);
    console.log('r[2] : ' + done[2]);
    console.log('r[3] : ' + JSON.stringify(done[3], null, 4));

    report_generated = true;
    //res.render(html);
    //fs.writeFileSync("./views/output.html",
    //res.render('template.html', {
    //swig.renderFile('views/template.html', {
    res.render('template', {
      results:  done[0],
      time:     done[1],
      build:    done[2],
      status:   done[3],
      executed: true
    });
  //);
  //res.render('template', { executed: report_generated});
  //res.redirect('/report');
  });
});


// Read execution log
app.get('/reports', function (req, res) {
  fs.readFile('./executions.log', 'utf8', function (err,data) {
    if (err) {
      res.render('reports', { log_entries: 'Error retrieving logs' });
    }
    res.render('reports', { log_entries: data.split("\n") });
  });
});


// Download execution log
app.get('/execution-log', function(req, res) {
  var file = './executions.log';
  var mimetype = mime.lookup(file);

  res.setHeader('Content-disposition', 'attachment; filename=executions.log');
  res.setHeader('Content-type', mimetype);

  var filestream = fs.createReadStream(file);
  filestream.pipe(res);
});


// Clear execution log
app.delete('/execution-log', function(req, res) {
  var file = './executions.log';
  fs.writeFile(file, '', function() {
    fs.readFile('./executions.log', 'utf8', function (err,data) {
      if (err) {
        res.render('reports', { log_entries: 'Error retrieving logs' });
      }
      res.render('reports', { log_entries: data.split("\n") });
    });
  });
});


app.listen(port);
console.log('\nApplication Started on http://localhost:' + port +'\n');
