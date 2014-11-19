# Website Diff

Website Diff will take screenshots of specified URLs and compare them with previous builds. Optionally, website login credentials can be specified.

HTML reports will be generated for the comparisons, flagging instances in which images don't match between builds as a failure. A third image will be generated that highlights the delta between the two, and included in the report.


## Screenshot

![Screenshot](http://at1as.github.io/github_repo_assets/webpage_diff.jpg)


## Usage

* git clone https://github.com/at1as/Website-Diff.git
* install dependencies (in server.js and driver.js)
* node server.js


## TODO

* phantomJS isn't waiting for JavaScript to load
* Strip image file names of unexpected characters
* driver.js needs a cleanup
* cleanly stop test execution
* compare screens only with same browser
* console logging may no longer be necessary


## Disclaimer

Work in progress - expect refactoring.
