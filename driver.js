var fs        = require("fs");
var async     = require("async");

var webdriver = require("selenium-webdriver");
var PNGDiff   = require("png-diff");
var colors    = require("colors");
var sleep     = require("sleep")

var setup     = require(__dirname + "/setup");
var render    = require(__dirname + "/render");


function run(body, done) {

  setup.directories();
  setup.files();

  // Test Variables
  var cur_build     = body.build || 'build not specified';
  var log_stamp     = 'Time : ' + (new Date).toISOString() + '\nBuild : ' + (cur_build || 'build not specified');
  var capabilities  = { 'browserName' : body.browser, 'chromeOptions': { args: ['--test-type'] }, 'phantomjs.cli.args': ['--ignore-ssl-errors=true',  '--web-security=false'] };
  var results       = [];
  var waiting       = 0;
  var status        = {'pass_count':0, 'fail_count':0, 'na_count':0, 'error_count':0, 'resolved_count':0, 'total':0}
  var test_started  = false;


  // Ensure all browser screenshots are same size
  var CHROME_OFFSET_H = 108;

  if (body.browser == "chrome") {
    var browser_height  = body.height + CHROME_OFFSET_H;
    var browser_width   = body.width;
  } else {
    var browser_height  = body.height;
    var browser_width   = body.width;
  }


  // Spawn Driver
  var driver =  new webdriver.Builder().
                withCapabilities(capabilities).
                build();

  driver.manage().window().setSize(parseInt(browser_width), parseInt(browser_height));

  // Login iff login parameters specified
  if (body.login_enabled) {
    driver.get(body.protocol + body.url + body.login_urn).then(function() {
    driver.sleep(1000);
    driver.findElement(webdriver.By.name(body.usr_val)).sendKeys(body.usr).then(function() {
      driver.findElement(webdriver.By.name(body.pwd_val)).sendKeys(body.pwd).then(function() {
          driver.sleep(1000);
          driver.findElement(webdriver.By.id(body.login_btn)).click().then(function() {
              driver.sleep(1000);
              testRunner();
          });
      });
    });
  });
  } else {
    testRunner();
  }


  // Loop through each URI
  function testRunner() {
    body.urn.forEach( function(i) {
      collectScreen(i, renderResults);
    });
  }


  // Generate final report only after all screens have been compared
  function renderResults() {

    console.log("renderResults() called");

    if (waiting == 0 && test_started == true) {

      console.log("Test Complete");

      driver.quit();
      var timestamp = (new Date).toISOString();
      status.total = status.pass_count + status.fail_count + status.na_count + status.error_count;

      log_stamp += '\nFail : ' + status.fail_count + '\nPass : ' + status.pass_count + '\nError : ' + status.error_count + '\nN/A : ' + status.na_count + '\nResolved : ' + status.resolved_count + '\n-----';
      fs.appendFile('executions.log', log_stamp + '\n', function (err) {
        if (err) console.log('Error appending version to execution log ' + err);
      });

      run_details = [results, timestamp, cur_build, status];
      return done(run_details);
    }
  }


  // Collect and Compare screens
  function collectScreen(urn, renderResults) { //renderResults()

    console.log("collectScreens() called")

    waiting ++;
    test_started = true;

    var uri         = body.protocol + body.url + urn;
    var uri_no_pro  = body.url + urn;
    var uri_safe    = uri_no_pro.replace(/\//g, "-");

    // Collect Screenshots
    function writeScreenshot(data, name) {
      var filename = name;
      var filepath = __dirname + "/public/assets/images/screenshots/new/";
      fs.writeFileSync(filepath + filename, data, 'base64');
      console.log("\nCapturing latest screens from: \n\t" + uri.green);
      //console.log("ScreenShot Taken");
    }

    // Navigate Driver to URL and compare screenshots
    driver.get(uri).then(function() {
      driver.sleep(1000);
    });

    driver.takeScreenshot().then(function(data) {

      writeScreenshot(data, uri_safe + '.png');

      // TODO: Phantonjs is too fast. Compares screenshots before they're written
      // Remove this sleep and make writeScreenshot blocking for all browsers
      if (body.browser == "phantomjs") {
        sleep.sleep(2);
      }

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
              waiting --;
              renderResults();
            } else {
              console.log('Comparing: \n\t' + old_screenshot.yellow + ' with ' + new_screenshot.yellow);
              if (diffMetric === 1) {
                console.log("Result: \n\t" + "Difference detected.".red + " Saved to " + diff_screenshot + "\n");
                testResult.result = 'FAIL';
                testResult.explanation = "Difference Detected";
                results.push(testResult);
                status.fail_count ++;
                waiting --;
                renderResults();
              } else {
                console.log("Result: \n\t" + "No difference.\n".green);
                testResult.result = 'PASS';
                results.push(testResult);
                status.pass_count ++;
                waiting --;
                renderResults();
              }
            }
          });
        } else {
          console.log("\nNo older screen to compare to.".yellow + " Setting this screen to master for the next run\n");
          fs.rename(new_screenshot, old_screenshot, function(err) {
            if (err) console.log("Error moving captured screenshot " + err);
          });
          testResult.result = 'N/A';
          testResult.explanation = "Nothing to compare with. Setting to master for next run.";
          results.push(testResult);
          status.na_count ++;
          waiting --;
          renderResults();
        }
      });
    });
  }
}

module.exports.run = run;
