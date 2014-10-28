var fs        = require("fs");
var async     = require("async");

var webdriver = require("selenium-webdriver");
var PNGDiff   = require("png-diff");
var colors    = require("colors");

var setup     = require(__dirname + "/setup");
var render    = require(__dirname + "/render");


function run(build, done) {

  // Ensure directory structure exists
  setup.directories();
  setup.files();

  // Test Variables
  var cur_build     = build || 'build not specified';
  var log_stamp     = 'Time : ' + (new Date).toISOString() + '\nBuild : ' + (cur_build || 'build not specified');
  var capabilities  = { 'browserName' : 'chrome' };
  var results       = [];
  var waiting       = 0;
  var browser_width = 980;
  var browser_height = 1027;
  var status        = {'pass_count':0, 'fail_count':0, 'na_count':0, 'error_count':0, 'resolved_count':0, 'total':0}
  var test_started  = false;

  // Retrieve and validate URI list
  try {
    var site_list = require(__dirname + "/sites.json");
    var uri_list  = JSON.parse(JSON.stringify(site_list));
  } catch (e) {
    console.error('\nsites.json is not valid JSON formatting: '.red + e + '\n');
    process.exit(1);
  }

  // Loop through each URI
  async.each(uri_list['urn'], function(i, step) {
    collectScreen(i, step);
  });

  // Generate final report only after all screens have been compared
  function renderResults() {
    if (waiting == 0 && test_started == true) {
      console.log("Not waiting!");
      var timestamp = (new Date).toISOString();
      status.total = status.pass_count + status.fail_count + status.na_count + status.error_count;
      //html = render.render(results, timestamp, cur_build, status);

      //fs.writeFileSync("./views/output-" + build + ".html", html);
      //fs.writeFileSync("./views/output.html", html);
      log_stamp += '\nFail : ' + status.fail_count + '\nPass : ' + status.pass_count + '\nError : ' + status.error_count + '\nN/A : ' + status.na_count + '\nResolved : ' + status.resolved_count + '\n-----';
      fs.appendFile('executions.log', log_stamp + '\n', function (err) {
        if (err) console.log('Error appending version to execution log ' + err);
      });

      temp = [results, timestamp, cur_build, status];

      return done(temp);
    }
  }


  // Collect and Compare screens
  function collectScreen(urn, step) {

    waiting ++;
    test_started = true;

    var proto       = uri_list["protocol"] + "://";
    var url         = proto + uri_list["url"];
    var uri         = url + urn;
    var uri_no_pro  = uri_list["url"] + urn;
    var uri_safe    = uri_no_pro.replace(/\//g, "-");

    // Collect Screenshots
    function writeScreenshot(data, name) {
      var filename = name;
      var filepath = __dirname + "/public/assets/images/screenshots/new/";
      fs.writeFileSync(filepath + filename, data, 'base64');
      console.log("\nCapturing latest screens from: \n\t" + uri.green);
    }

    // Spawn Driver(s)

    var driver = new webdriver.Builder().
        withCapabilities(capabilities).
        build();

    driver.manage().window().setSize(browser_width, browser_height);

    // Navigate Driver to URL
    driver.get(uri);

    // Compare screenshots
    driver.takeScreenshot().then(function(data, done) {

      writeScreenshot(data, uri_safe + '.png');

      var prev_dir  = __dirname + '/public/assets/images/screenshots/old/';
      var curr_dir  = __dirname + '/public/assets/images/screenshots/new/';
      var diff_dir  = __dirname + '/public/assets/images/screenshots/results/';
      var old_screenshot  = prev_dir + uri_safe + '.png';
      var new_screenshot  = curr_dir + uri_safe + '.png';
      var diff_screenshot = diff_dir + uri_safe + '.png';

      testResult      = {};
      testResult.img1 = '/assets/images/screenshots/old/' + uri_safe + '.png';
      testResult.img2 = '/assets/images/screenshots/new/' + uri_safe + '.png';
      testResult.diff = '/assets/images/screenshots/results/' + uri_safe + '.png';
      testResult.uri  = uri;

      fs.exists(old_screenshot, function(exists) {

        if (exists) {
          PNGDiff.outputDiff(old_screenshot, new_screenshot, diff_screenshot, function(err, diffMetric) {
            if (err) {
              console.log("Result: \n\t" + "Error comparing screenshots ".red + err);
              testResult.result = 'ERROR';
              testResult.explanation = "Error comparing screenshots: \n" + err;
              results.push(testResult);
              status.error_count ++;
            } else {
              console.log('Comparing: \n\t' + old_screenshot.yellow + ' with ' + new_screenshot.yellow);
              if (diffMetric === 1) {
                console.log("Result: \n\t" + "Difference detected.".red + " Saved to " + diff_screenshot + "\n");
                testResult.result = 'FAIL';
                testResult.explanation = "Difference Detected";
                results.push(testResult);
                status.fail_count ++;
              } else {
                console.log("Result: \n\t" + "No difference.\n".green);
                testResult.result = 'PASS';
                results.push(testResult);
                status.pass_count ++;
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
          status.na_count ++;
        }
        waiting --;
        step();
      });
    });

    // Per test teardown - Quit Driver
    driver.quit();
  }
}

module.exports.run = run;
