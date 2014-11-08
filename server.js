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
app.disable('etag');

port        = process.env.PORT || 8080;
test_data   = [];
base_config = {'browser':['chrome', 'phantomjs'],'width':1000,'height':1000, url:'www.google.com/', urn: ['plus']}
report_generated = false;


// Load configuration page on start
app.get('/', function (req, res) {
  res.render('template', {
    results:  test_data[0],
    time:     test_data[1],
    build:    test_data[2],
    status:   test_data[3],
    executed: report_generated
  });
});


// Report (from last run)
app.get('/report', function (req, res) {
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

  // TODO - clip last 4 lines off log file and rewrite

  res.status(200).end();
});


// Load configuration page
app.get('/config', function (req, res) {
  fs.readFile('./last-run.json', 'utf8', function (err, data) {
    if (err) {
      res.render('config', { config: base_config });
    } else {
      res.render('config', { config: JSON.parse(data) });
    }
  });
});


// Execute new test
app.post('/execute', function (req, res) {
  fs.writeFile('./last-run.json', JSON.stringify(req.body));

  console.log("Request Details: " + JSON.stringify(req.body));
  driver.run(req.body, function(done){

    test_data = done || [];
    report_generated = true;

    res.render('template', {
      results:  done[0],
      time:     done[1],
      build:    done[2],
      status:   done[3],
      executed: true
    });
  });
});


// Save Test Environment
app.post('/save-test', function (req, res) {

  env_name  = req.body.title;
  env       = req.body;
  path      = './saved-env/' + env_name + '.json';

  delete env["title"];

  fs.writeFile(path, JSON.stringify(env));
  fs.readFile(path, 'utf8', function (err, data) {
    if (err) {
      res.render('config', { config: base_config });
    } else {
      res.render('config', { config: JSON.parse(path) });
    }
  });
});


// Return list of saved test environments
app.get('/test-list', function(req, res) {
  var file_list = fs.readdirSync('./saved-env/');
  var filtered_list = [];
  file_list.forEach(function(file) {
    if (file.substring(file.length-5) == ".json") {
      filtered_list.push(file);
    }
  });
  res.send(filtered_list);
});


// Render page with loaded environment
app.get('/test-list/:env', function(req, res) {

  var path = './saved-env/' + req.params.env;
  var loaded_env = fs.readFileSync(path, 'utf8')

  res.render('config', { config: JSON.parse(loaded_env) });

  /*
  fs.readFileSync(path, 'utf8', function (err, data) {
    if (err) {
      console.log("HELLO2");
      res.render('config', { config: base_config });
    } else {
      console.log("HELLO");
      res.render('config', { config: JSON.parse(path) });
    }
  });*/
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
      res.render('reports', { log_entries: data.split('\n') });
    });
  });
});


// Clear saved screens
app.delete('/screens', function(req, res) {
  var screens_path_old  = __dirname + '/public/assets/images/screenshots/old/';
  var screens_path_new  = __dirname + '/public/assets/images/screenshots/new/';
  var screens_path_diff = __dirname + '/public/assets/images/screenshots/results/';

  var old_files   = fs.readdirSync(screens_path_old) || [];
  var new_files   = fs.readdirSync(screens_path_new) || [];
  var diff_files  = fs.readdirSync(screens_path_diff) || [];

  old_files.forEach( function(file) {
    fs.unlink(screens_path_old + file);
  });
  new_files.forEach( function(file) {
    fs.unlink(screens_path_new + file);
  });
  diff_files.forEach( function(file) {
    fs.unlink(screens_path_diff + file);
  });

  res.status(200).end();
});


app.listen(port);
console.log('\nApplication Started on http://localhost:' + port +'\n');
