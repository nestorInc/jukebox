/**
* This file describes what should be generated with gruntjs
* See: https://github.com/TiTi/jukebox/wiki/gruntjs
*/

module.exports = function(grunt)
{
	var SRC_DIR = 'html_src/',
		SRC =
		{
			css: 	SRC_DIR + 'css/',
			js: 	SRC_DIR + 'js/',
			libs: 	SRC_DIR + 'js/lib/',
			img: 	SRC_DIR + 'images/',
		},

		OUT_DIR = 'html/',
		OUT =
		{
			css: 	OUT_DIR + 'css/',
			js: 	OUT_DIR + 'js/',
			libs: 	OUT_DIR + 'js/lib/'
		};

	grunt.initConfig(
	{
		concat:
		{
			js:
			{
				src:
				[
					SRC.js + 'notifications.js',

					SRC.js + 'intro.js',

					// Helpers
					SRC.js + 'genres.js',
					SRC.js + 'tools.js',

					// Tabs
					SRC.js + 'tab/tabs.js',
					SRC.js + 'tab/search.js',
					SRC.js + 'tab/upload.js',
					SRC.js + 'tab/debug.js',
					SRC.js + 'tab/customQueries.js',
					SRC.js + 'tab/notification.js',
					
					// Class
					SRC.js + 'action.js',
					SRC.js + 'query.js',
					SRC.js + 'musicFieldEditor.js',

					// Jukebox
					SRC.js + 'jukebox.js',
					SRC.js + 'jukeboxUI.js',

					SRC.js + 'outro.js'
				],
				dest: OUT.js + 'jukebox.js'
			},
			css:
			{
				src:
				[
					SRC.css + 'normalize.css',
					SRC.css + 'style.css',
					SRC.css + 'fileuploader.css'
				],
				dest: OUT.css + 'jukebox.css'
			}
		},
		min:
		{
			js:
			{
				src: '<config:concat.js.dest>',
				dest: OUT.js + 'jukebox.min.js'
			},
			libs:
			{
				src:
				[
					/* prototype.js and scriptaculous.js not included, see copy task */
					SRC.libs + 'json2.js',
					SRC.libs + 'tablekit.js',
					SRC.libs + 'fileuploader.js',
					SRC.libs + 'Sound.js'
				],
				dest: OUT.libs + 'libs.min.js'
			}
		},
		cssmin:
		{
			css:
			{
				src: '<config:concat.css.dest>',
				dest: OUT.css + 'jukebox.min.css'
			}
		},
		lint:
		{
			notifications: 	SRC.js + 'notifications.js',
			action: 		SRC.js + 'action.js',
			query: 			SRC.js + 'query.js',
			//genres: 		SRC.js + 'genres.js',
			tools: 			SRC.js + 'tools.js'
		},
		jshint:
		{
			options:
			{
				curly: true,
				eqeqeq: false,
				immed: true,
				latedef: true,
				newcap: false,
				noarg: false,
				sub: true,
				undef: true,
				unused: true,
				eqnull: true,
				browser: true
			},
			globals:
			{
				JSON: true,
				Ajax: true,
				Notifications: true,
				Sound: true,
				Draggable: true,
				Droppables: true,
				$R: true,
				$: true,
				$$: true,
				Class: true,
				Control: true,
				Element: true,
				Event: true,
				TableKit: true,
				qq: true
			},
			notifications:
			{
				globals: {$: true, Effect: true, Event: true}
			},
			action:
			{
				globals: {Extend: true}
			},
			query:
			{
				globals: {Action: true}
			},
			genres:
			{
				options: {smarttabs: true}
			},
			tools:
			{
				options: {unused: false, eqeqeq: false, eqnull: true}
			}
		},
		copy:
		{
			root:
			{
				src:
				[
					SRC_DIR + 'favicon.ico',
					SRC_DIR + 'index.html',
					SRC_DIR + 'SoundBridge.swf'
				],
				dest: OUT_DIR
			},
			images:
			{
				src:
				[
					SRC.img + '*.png',
					SRC.img + '*.jpg',
					SRC.img + '*.gif',
					SRC.img + 'icons/*.png'
				],
				dest: OUT_DIR
			},
			libs:
			{
				src:
				[
					SRC.libs + 'prototype.js',
					SRC.libs + 'scriptaculous.js'
				],
				dest: OUT_DIR
			},
			scriptaculous:
			{
				src:
				[
					SRC.libs + 'slider.js',
					SRC.libs + 'dragdrop.js',
					SRC.libs + 'effects.js'
				],
				dest: OUT_DIR
			}
		}
	});

	grunt.loadNpmTasks('grunt-css');

	grunt.registerMultiTask("copy", "Copy files to destination folder", function()
	{
		var files = grunt.file.expandFiles(this.file.src),
			dest = this.file.dest;

		files.forEach(function(fileName)
		{
			var destination = fileName.replace(SRC_DIR, dest);
			//grunt.log.writeln("Copying " + fileName + " to " + destination);
			grunt.file.copy(fileName, destination);
			grunt.log.writeln("Copied " + fileName + " to " + destination);
		});

		// Fail task if errors were logged.
		if (this.errorCount) { return false; }

		// Otherwise, print a success message.
		grunt.log.writeln(this.target + " copy done.");
	});

	grunt.registerTask('default', /*'lint '+*/'concat min cssmin copy');
};
