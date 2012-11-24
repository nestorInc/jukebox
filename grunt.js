/**
* This file describes what should be generated with gruntjs
* See: https://github.com/TiTi/jukebox/wiki/gruntjs
*/

module.exports = function(grunt)
{
	var SRC_DIR = 'html_src/',
		SRC =
		{
			css:	SRC_DIR + 'css/',
			js:		SRC_DIR + 'js/',
			tab:	SRC_DIR + 'js/tab/',
			libs:	SRC_DIR + 'js/lib/',
			img:	SRC_DIR + 'images/'
		},

		OUT_DIR = 'html/',
		OUT =
		{
			css:	OUT_DIR + 'css/',
			js:		OUT_DIR + 'js/',
			libs:	OUT_DIR + 'js/lib/'
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
					SRC.css + 'fileuploader.css',
					SRC.css + 'flashblock.css'
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
			domReady:
			{
				src: SRC.libs + 'domReady.js',
				dest: OUT.libs + 'domReady.min.js'
			},
			libs:
			{
				src:
				[
					/* prototype.js and scriptaculous.js not included, see copy task */
					SRC.libs + 'json2.js',
					SRC.libs + 'tablekit.js',
					SRC.libs + 'fileuploader.js',

					// scriptaculous dependancies
					SRC.libs + 'slider.js',
					SRC.libs + 'effects.js',
					SRC.libs + 'dragdrop.js' // dragdrop needs effects
				],
				dest: OUT.libs + 'libs.min.js'
			}/*,
			prototype: // prototypejs website doesn't provide a minified version => use our own
			{
				src: SRC.libs + 'prototype.js',
				dest: OUT.libs + 'prototype.min.js' // doesn't works :(
			}*/
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
			grunt: "grunt.js",

			notifications:	SRC.js + 'notifications.js',
			action:			SRC.js + 'action.js',
			query:			SRC.js + 'query.js',
			genres:			SRC.js + 'genres.js',
			tools:			SRC.js + 'tools.js',
			fieldEditor:	SRC.js + 'musicFieldEditor.js',
			jukebox:		SRC.js + 'jukebox.js',
			jukeboxui:		SRC.js + 'jukeboxUI.js',

			// tab/
			tabs:				SRC.tab + 'tabs.js',
			tab_customQueries:	SRC.tab + 'customQueries.js',
			tab_debug:			SRC.tab + 'debug.js',
			tab_notification:	SRC.tab + 'notification.js',
			tab_search:			SRC.tab + 'search.js',
			tab_upload:			SRC.tab + 'upload.js'
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
				browser: true,
				loopfunc: true,
				scripturl: true
			},
			globals:
			{
				// Libs
				JSON: true,
				Ajax: true,
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
				qq: true,

				// By our code
				Notifications: true,
				Tab: true,
				genres: true,
				FormatTime: true,
				SortUnique: true
			},
			grunt:
			{
				globals: {module: true}
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
			tools:
			{
				options: {unused: false, eqeqeq: false, eqnull: true}
			},
			fieldEditor:
			{
				options: {nonstandard: true, loopfunc: true, sub: true},
				globals: {genres: true, genresOrdered: true}
			},
			jukebox:
			{
				globals: {Extend: true, Query: true, Action: true, JukeboxUI: true, soundManager: true, Notifications: true, Ajax: true, $R: true}
			},
			jukeboxui:
			{
				options: {multistr: true},
				globals: {Extend: true, Tabs: true, FormatTime: true, SearchTab: true, UploadTab: true, DebugTab: true, NotificationTab: true, CustomQueriesTab: true, genresOrdered: true, $: true, $$: true, $R: true, Draggable: true, Droppables: true, Element: true, Event: true, Control: true}
			},
			tab_customQueries:
			{
				globals: {Tab: true, Action: true, Query: true, Class: true, $: true, Notifications: true, sendQueryProxy: true}
			},
			tab_debug:
			{
				globals: {JsonPrettyPrint: true, Tab: true, Class: true, $: true}
			},
			tab_upload:
			{
				options: {nonstandard: true, sub: true}
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
					SRC_DIR + 'soundmanager2_flash9.swf'
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
					SRC.libs + 'require.min.js',
					SRC.libs + 'soundmanager2-nodebug-jsmin.js',
					SRC.libs + 'prototype.js'/*,
					SRC.libs + 'scriptaculous.js' // No more used */
				],
				dest: OUT_DIR
			}/* Not required since thoses are integrated now into libs.min.js,
			scriptaculous:
			{
				src:
				[
					SRC.libs + 'slider.js',
					SRC.libs + 'dragdrop.js',
					SRC.libs + 'effects.js'
				],
				dest: OUT_DIR
			}*/
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

	grunt.registerTask('default', 'lint concat min cssmin copy');
};
