# Website Diff

Website Diff will take a screenshot of specified pages for a website (or of a product's webUI) and compare it with a prior build.

HTML reports will be generated for the comparisons, flagging instances in which images don't match between builds as a failure. A third image will be generated that highlights the delta between the two, and included in the report.


## Screenshot

![Screenshot](http://at1as.github.io/github_repo_assets/webpage_diff.jpg)


## Usage

* clone repository
* install dependencies
* node server.js


## TODO

* Hardcode browser view offset (a 1000x1000 chrome driver, takes a screenshot less than 1000x1000 due to borders)
* Update logs to reflect new master
* Strip image file names of unexpected characters


## Disclaimer

Work in progress. Expect lots of refactoring.
