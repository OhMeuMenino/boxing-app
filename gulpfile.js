var gulp = require('gulp');
var webserver = require('gulp-webserver'); // https://www.npmjs.com/package/gulp-webserver
var inject = require('gulp-inject'); // https://www.npmjs.com/package/gulp-inject
var util = require('gulp-util'); // https://www.npmjs.com/package/gulp-util
var debug = require('gulp-debug'); // https://www.npmjs.com/package/gulp-debug
var jshint = require('gulp-jshint'); // https://github.com/spalger/gulp-jshint
var jscs = require('gulp-jscs'); // https://github.com/jscs-dev/gulp-jscs
var yargs = require('yargs').argv; // https://www.npmjs.com/package/yargs
var gulpif = require('gulp-if'); // https://github.com/robrich/gulp-if
var annotate = require('gulp-ng-annotate'); // https://www.npmjs.com/package/gulp-ng-annotate
var filter = require('gulp-filter'); // https://www.npmjs.com/package/gulp-filter
var uglify = require('gulp-uglify'); // https://github.com/terinjokes/gulp-uglify
var useref = require('gulp-useref'); // https://www.npmjs.com/package/gulp-useref
var minify = require('gulp-minify-css'); // https://www.npmjs.com/package/gulp-minify-css
var imagemin = require('gulp-imagemin'); // https://github.com/sindresorhus/gulp-imagemin
var listing = require('gulp-task-listing'); // https://www.npmjs.com/package/gulp-task-listing
var templatecache = require('gulp-angular-templatecache'); // https://www.npmjs.com/package/gulp-angular-templatecache
var htmlmin = require('gulp-htmlmin'); // https://github.com/jonschlinkert/gulp-htmlmin
var config = require('./gulp.config.js');
var runsequence = require('run-sequence'); // https://www.npmjs.com/package/run-sequence

/**
 * Prepares everything to serve the development build
 */
gulp.task('serve', ['bower-html-inject', 'webserver', 'watchers'], function() {
    util.log(util.colors.bgBlue('Serving Development'));
});

/**
 * Starts a webserver to launch the development build
 */
gulp.task('webserver', ['dev-settings'], function() {
    gulp.src(config.root)
        .pipe(webserver({
            // https://github.com/schickling/gulp-webserver
            // http://stephenradford.me/gulp-angularjs-and-html5mode/
            fallback: config.index,
            livereload: true,
            open: true
        }));
});

/**
 * Launch a webserver to serve the production build
 */
gulp.task('serve-production', ['build'], function() {
    util.log(util.colors.bgBlue('Serving Production Build'));
    gulp.src(config.build)
        .pipe(webserver({
            // https://github.com/schickling/gulp-webserver
            // http://stephenradford.me/gulp-angularjs-and-html5mode/
            fallback: config.index,
            livereload: true,
            open: true
        }));
});

/**
 * Watcher setup, watch for changes in js, css and html files
 * ignore changes to the templates.js file since it is auto-generated
 *
 *  @bug when adding folders gulp might crash, at least in linux
 *  the problem seems to be with gaze, and has no easy solution
 */
gulp.task('watchers', function(){
    util.log(util.colors.bgBlue('Setting Up Watchers'));
    gulp.watch([config.jsfiles, config.cssfiles, config.htmlfiles, '!/app/core/templates.js'], ['html-inject']);
    // we could set up here a watcher for the bower files, but that means the task
    // will run twice on install, and none on uninstall since there appears
    // to be some issues with the watch task and also with the gaze dependency
    // so we decided to go back and use bower hooks, unfortunately bower does not
    // have a postuninstall hook, so we are f... well, i've discover that it supports preuninstall
    // so we are going that route, see the .bowerrc file
});

/**
 *  Read the index.html file and inject css and js files using gulp-inject
 */
gulp.task('html-inject', ['templatecache'], function() {
    // gulp util uses chalk, see reference
    // https://github.com/chalk/chalk
    util.log(util.colors.bgBlue('Custom Code HTML Inject'));
    return gulp
   .src(config.index)
        // gulp src options: https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpsrcglobs-options
        // we do not need to read the file content, all we need here are the paths
        // gulp inject options: https://github.com/klei/gulp-inject#optionsrelative
        .pipe(inject(gulp.src(config.jsfiles.concat(config.cssfiles), {read: false}), {relative: false, addRootSlash: false}))
   .pipe(gulp.dest(config.root));
});

/**
 *  Uses Wiredep to read dependencies from bower.json file
 *  and inject them in the index.html file
 *  this task is also called by the hooks defined in .bowerrc
 *  we have a task dependency on html-inject because
 *  on launch if we have two tasks in parallel injecting in the html
 *  on of them will override the changes made by the other
 */
gulp.task('bower-html-inject', ['html-inject'], function() {
    util.log(util.colors.bgBlue('Bower Dependencies HTML Inject'));
    var wiredep = require('wiredep').stream;

    var options = {
        bowerJson: require(config.bowerjson),
        directory: config.libs
    };

    return gulp
   .src(config.index)
   .pipe(wiredep(options))
   .pipe(gulp.dest(config.root));
});

/**
 * Lints JavaScript code and enforces coding style. Rules are
 * defined in .jshintrc and .jscsrc respectively
 */
gulp.task('check', function(){
    runsequence('check-jshint', 'check-jscs');
});

/**
 * Code linting using jshint
 */
gulp.task('check-jshint', function() {
    util.log(util.colors.bgBlue('Code check using JSHint'));
    return gulp
   .src(config.jsfiles)
   .pipe(jshint())
   .pipe(jshint.reporter('jshint-stylish'), {verbose: true}); // stylish reporter https://github.com/sindresorhus/jshint-stylish
});

/**
 * Check code style using jscs
 */
gulp.task('check-jscs', function() {
    util.log(util.colors.bgBlue('Code check using JSCS'));
    return gulp
   .src(config.jsfiles)
   .pipe(jscs())
   .pipe(jscs.reporter());
});

/**
 * Creates a build to prepare the app for production
 * reads the index.html and picks the required css and js
 * files using useref
 */
gulp.task('build', ['bower-html-inject', 'html-inject', 'images', 'icons', 'production-settings'], function() {
    util.log(util.colors.bgBlue('Building App for Production'));
    return gulp
    .src(config.index)
    .pipe(useref())
    .pipe(gulpif('*.js', annotate()))
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', minify()))
    .pipe(gulp.dest(config.build));
});

/**
 * Compresses images and copies them to the build folder
 */
gulp.task('images', function() {
    util.log(util.colors.bgBlue('Compressing and Copying Images to Build Folder'));
    return gulp
   .src(config.images)
   .pipe(imagemin())
   .pipe(gulp.dest(config.build + 'images'));
});

/**
 * Copies icons to build folder
 */
gulp.task('icons', function() {
    var dest = config.build + 'content/icons';
    util.log(util.colors.bgBlue('Copying Icons to Build Folder'));
    return gulp
        .src(config.icons)
        .pipe(gulp.dest(dest));
});

/**
 * Copies development settings file to app folder
 */
gulp.task('dev-settings',function(){
    util.log(util.colors.bgBlue('Copying Development Settings File'));
    return gulp
   .src('dist/angular/development/settings.js')
   .pipe(gulp.dest(config.core));
});

/**
 * Copies production settings file to app folder
 */
gulp.task('production-settings',function(){
    util.log(util.colors.bgBlue('Copying Production Settings File'));
    return gulp
   .src('dist/angular/production/settings.js')
   .pipe(gulp.dest(config.core));
});

/**
 * Creates $templateCache from the html templates
 */
gulp.task('templatecache', function() {
    util.log(util.colors.bgBlue('Create an Angular Template Cache'));
    return gulp
        .src(config.htmlfiles)
        // http://perfectionkills.com/experimenting-with-html-minifier/#collapse_whitespace
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(templatecache('templates.js', {
            module: 'app.core',
            standalone: false,
            root: 'app/'
        }))
        .pipe(gulp.dest(config.core));
});

/**
 * Lists all available tasks
 * @todo customize list by overring filters
 * By default, is is defined as the regular expression /[-_:]/
 * which means that any task with a hyphen, underscore, or colon in it's name is assumed to be a subtask
 */
gulp.task('help', listing);

/**
 * Sets up the default task, this just calls the help task
 */
gulp.task('default', ['help']);
