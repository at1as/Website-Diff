var express     = require('express');
var http        = require('http');
var swig        = require('swig');
var bodyParser  = require('body-parser');
var fs          = require('fs');
var mime        = require('mime');
var _           = require('underscore');

app             = express();

var render      = require(__dirname + "/render.js");
var driver      = require(__dirname + '/driver.js');
var setup       = require(__dirname + "/setup.js");
var image_swap  = require(__dirname + '/move.js');
var logger      = require(__dirname + '/logger.js');


app.engine('html', swig.renderFile);
app.set('api_version', 'v1.0');
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.disable('etag');


PROJECT_URL = 'https://github.com/at1as/Website-Diff';
BROWSERS    = ['chrome', 'phantomjs'];
test_data   = [];
base_config = {'browser':'chrome','width':1000,'height':1000, url:'', urn: []}
report_generated = false;

setup.directories();
setup.files();


// Return API Version
app.get('/version', function (req, res) {
    env_details = { 'API Version' : app.get('api_version'),
                    'Docs'        : PROJECT_URL }
    res.send(env_details);
});


// Load configuration page on start
app.get('/', function (req, res) {
  res.render('template', {
    results:  test_data[0],
    time:     test_data[1],
    build:    test_data[2],
    status:   test_data[3],
    browser:  test_data[4],
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
    browser:  test_data[4],
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

  // Update Fail count in log entry
  logger.editLogEntry();

  res.status(200).end();
});


// Load Admin page
app.get('/admin', function (req, res) {
  res.render('admin', {});
});


// Delete a saved environment
app.delete('/env/:env', function (req, res) {

  var env = './saved-env/' + req.params.env;
  fs.unlink(env);

  res.render('admin');
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
      browser:  done[4],
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
      res.render('config', { config: data });
    }
  });
});


// Return list of browsers
app.get('/browser-list', function(req, res) {
  var browser_list = fs.readFileSync('./browser-list.json');
  res.send(JSON.parse(browser_list).browsers);
});


// Update list of browsers
app.post('/browser-list', function(req, res) {

  var old_browser_list  = JSON.parse(fs.readFileSync('./browser-list.json'));
  var browser_list      = _.clone(old_browser_list);
  browser_list.browsers = req.body.new_browser_list;

  // Create screenshot folders for added browsers
  var added_browsers    = _.difference(browser_list.browsers, old_browser_list.browsers);
  _.each(added_browsers, function(browser){
    setup.screensDir(browser);
  });

  // Save new browser list
  fs.writeFileSync('./browser-list.json', JSON.stringify(browser_list));
  res.status(200).end();
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

  fs.readFile(path, 'utf8', function (err, data) {
    if (err) {
      res.render('config', { config: base_config });
    } else {
      res.render('config', { config: JSON.parse(data) });
    }
  });
});


// Read execution log (JSON)
app.get('/reports', function (req, res) {
  fs.readFile('./executions.json', 'utf8', function (err,data) {
    if (err) {
      res.render('reports', { log_entries: 'Error retrieving logs' });
    }
    res.render('reports', { log_entries: JSON.parse(data) });
  });
});


// Download execution log
app.get('/execution-log', function(req, res) {
  var file = './executions.json';
  var mimetype = 'text/plain';
  var timestamp = (new Date).toISOString();

  res.setHeader('Content-disposition', 'attachment; filename=executions-' + timestamp);
  res.setHeader('Content-type', mimetype);

  var filestream = fs.createReadStream(file);
  filestream.pipe(res);
});


// Clear execution log
app.delete('/execution-log', function(req, res) {
  var file = './executions.json';
  fs.writeFile(file, JSON.stringify({"log" : []}), function() {
    fs.readFile('./executions.json', 'utf8', function (err,data) {
      if (err) {
        res.render('reports', { log_entries: 'Error retrieving logs' });
      }
        res.render('reports', { log_entries: JSON.parse(data) });
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

  report_generated = false;

  res.status(200).end();
});


app.listen(app.get('port'), function() {
  console.log('\nApplication Started on http://localhost:' + app.get('port') +'\n');
});
