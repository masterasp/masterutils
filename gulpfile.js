var gulp = require('gulp');
var browserify = require('gulp-browserify');


gulp.task('default', function() {
    // Single entry point to browserify
    gulp.src('src/masterutils.js')
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulp.env.production
        }))
        .pipe(gulp.dest('./dist/'));
});
