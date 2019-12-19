const { src, dest, parallel, watch } = require('gulp');
const postcss = require('gulp-postcss');
const purgecss = require('gulp-purgecss');
const sass = require('gulp-sass');
const minifyCSS = require('gulp-csso');
const concat = require('gulp-concat');


function build_css() {
  return src('css/*.css')
    .pipe(postcss())
    .pipe(purgecss({
        content: ['../templates/**/*.html']
    }))
    .pipe(minifyCSS())
    .pipe(dest('dist/static/css'))
}

function build_sass() {
  return gulp.src('css/**/*.scss')
  .pipe(sass().on('error',sass.logError))
  .pipe(postcss())
  .pipe(gulp.dest('dist/static/css'));

}

function watch_css() {
  watch(['css/*.css'], build_css);  
  watch(['css/*.scss'], build_sass);

}

// // exports.js = js;
exports.watch = watch_css;

// // exports.default = parallel(css, js);
// exports.default = parallel(css);