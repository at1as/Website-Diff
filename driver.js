var fs        = require("fs");
var async     = require("async");

var webdriver = require("selenium-webdriver");
var PNGDiff   = require("png-diff");
var colors    = require("colors");

var site_list = require(__dirname + "/sites.json");
var setup     = require(__dirname + "/setup");
var render    = require(__dirname + "/render");


// Ensure directory structure exists
setup.directories();
setup.files();

// Test Variables
var log_stamp     = (new Date).toISOString() + ' : ' + (process.argv[2] || 'build not specified');
var build         = process.argv[2] || 'build not specified';
var capabilities  = { 'browserName' : 'chrome' };
var results       = [];
var waiting       = 0;

// Retrieve URI list to test
var uri_list  = JSON.parse(JSON.stringify(site_list));

// Loop through each URI
async.each(uri_list["urn"], function(i, step) {
  collectScreen(i, step);
});

// Generate final report only after all screens have been compared
function renderResults() {
  if (!waiting) {
    var timestamp = (new Date).toISOString();
    html = render.render(results, timestamp, build);
    fs.writeFileSync("./output.html", html);
    fs.appendFile('executions.log', log_stamp + '\n', function (err) {
      if (err) { console.log("Error appending version to execution log " + err); }
    });
  }
}


// Collect and Compare screens
function collectScreen(urn, step) {

  waiting ++;

  var proto       = uri_list["protocol"] + "://";
  var url         = proto + uri_list["url"];
  var uri         = url + urn;
  var uri_no_pro  = uri_list["url"] + urn;
  var uri_safe    = uri_no_pro.replace(/\//g, "-");

  // Collect Screenshots
  function writeScreenshot(data, name) {
    var filename = name || 'screenshot.png';
    var filepath = __dirname + "/screenshots/new/";
    fs.writeFileSync(filepath + filename, data, 'base64');
    console.log("\nCapturing latest screens from: \n\t" + uri.green);
  }

  // Spawn Driver(s)
  var driver = new webdriver.Builder().
      withCapabilities(capabilities).
      build();

  driver.manage().window().maximize();

  // Navigate Driver to URL
  driver.get(uri);

  // Compare screenshots
  driver.takeScreenshot().then(function(data, done) {

    writeScreenshot(data, uri_safe + '.png');

    var prev_dir  = __dirname + '/screenshots/old/';
    var curr_dir  = __dirname + '/screenshots/new/';
    var diff_dir  = __dirname + '/screenshots/results/';
    var old_screenshot  = prev_dir + uri_safe + '.png';
    var new_screenshot  = curr_dir + uri_safe + '.png';
    var diff_screenshot = diff_dir + uri_safe + '.png';

    testResult      = {};
    testResult.img1 = './screenshots/old/' + uri_safe + '.png';
    testResult.img2 = './screenshots/new/' + uri_safe + '.png';
    testResult.diff = './screenshots/results/' + uri_safe + '.png';
    testResult.uri  = uri;

    fs.exists(old_screenshot, function(exists) {
      if (exists) {
        PNGDiff.outputDiff(old_screenshot, new_screenshot, diff_screenshot, function(err, diffMetric) {
          if (err) {
            console.log("Result: \n\t" + "Error comparing screenshot ".red + err);
            testResult.result = 'ERROR';
            testResult.explanation = "Error comparing screenshots: " + err;
            results.push(testResult);
          } else {
            console.log('Comparing: \n\t' + old_screenshot.yellow + ' with ' + new_screenshot.yellow);
            if (diffMetric === 1) {
              console.log("Result: \n\t" + "Difference detected.".red + " Saved to " + diff_screenshot + "\n");
              testResult.result = 'FAIL';
              testResult.explanation = "Difference Detected";
              results.push(testResult);
            } else {
              console.log("Result: \n\t" + "No difference.\n".green);
              testResult.result = 'PASS';
              results.push(testResult);
            }
          }
          renderResults();
        });
      } else {
        console.log("\nNo older screen to compare to.".yellow + " Setting this screen to master for the next run\n");
        fs.rename(new_screenshot, old_screenshot, function(err) {
          if (err) console.log("Error moving captured screenshot " + err);
        });
        testResult.result = 'N/A';
        testResult.explanation = "Nothing to compare with. Setting to master for next run.";
        results.push(testResult);
        renderResults();
      }
      waiting --;
      step();
    });
  });

  /* Per test teardown - Quit Driver */
  driver.quit();
}
