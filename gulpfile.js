var gulp = require('gulp');
var browserify = require('gulp-browserify');
var argv = require('yargs').argv;

gulp.task('default', function() {
    // Single entry point to browserify
    gulp.src('src/masterutils.js')
        .pipe(browserify({
          insertGlobals : false,
          debug : !!argv.release
        }).on('error', function(e){
            console.log(e);
         }))
        .pipe(gulp.dest('./dist/'));
});
