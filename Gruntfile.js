
module.exports = function(grunt) {

  grunt.initConfig({
    product: 'OSMBuildings',

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: '\n',
        banner: 'var <%=product%> = (function(global) {\n\n',
        footer: '\nreturn <%=product%>; }(this));'
      },
      dist: {
        src: grunt.file.readJSON('files.json'),
        dest:  'dist/<%=product%>-Leaflet.debug.js'
      }
    },

    uglify: {
      options: {},
      build: {
        src: 'dist/<%=product%>-Leaflet.debug.js',
        dest: 'dist/<%=product%>-Leaflet.js'
      }
    },

    jshint: {
      all: ['dist/<%=product%>-Leaflet.debug.js']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', 'Development build', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('concat');
  });

  grunt.registerTask('release', 'Release build', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('concat');
    grunt.task.run('jshint');
    grunt.task.run('uglify');
  });
};
