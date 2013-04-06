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
			skin:	SRC_DIR + 'css/skin/',
			js:		SRC_DIR + 'js/',
			tab:	SRC_DIR + 'js/tab/',
			libs:	SRC_DIR + 'js/lib/',
			skinjs: SRC_DIR + 'js/skin/',
			img:	SRC_DIR + 'images/'
		},

		OUT_DIR = 'html/',
		OUT =
		{
			css:	OUT_DIR + 'css/',
			skin:	OUT_DIR + 'css/skin/',
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
					SRC.js + 'storage.js',

					// Tabs
					SRC.js + 'tab/tabs.js',
					SRC.js + 'tab/search.js',
					SRC.js + 'tab/upload.js',
					SRC.js + 'tab/debug.js',
					SRC.js + 'tab/playlist.js',
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
		uglify:
		{
			js:
			{
				src: '<%= concat.js.dest %>',
				dest: OUT.js + 'jukebox.min.js',
				options:
				{
					mangle:
					{
						except:['$super']
					}
				}
			},
			jsSkin:
			{
				src:
				[
					SRC.skinjs + 'default.js',
					SRC.skinjs + 'light.js',
					SRC.skinjs + 'hype.js'
				],
				dest: OUT.js + 'skins.min.js'
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
				src: '<%= concat.css.dest %>',
				dest: OUT.css + 'jukebox.min.css'
			},
			cssSkins: // For now, concat all skins inside a single minified file
			{
				src: [SRC.skin + 'default.css', SRC.skin + 'light.css', SRC.skin + 'hype.css'],
				dest: OUT.skin + 'jukebox-skins.min.css'
			}
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
				scripturl: true,
				globals:
				{
					// Libs
					JSON: true,
					/*Ajax: true,
					Draggable: true,
					Droppables: true,
					$R: true,
					$: true,
					$$: true,*/
					Class: true,
					Control: true,
					Element: true,
					Event: true,
					Template: true,
					TableKit: true,
					qq: true,

					// By our code
					Notifications: true,
					Tab: true,
					genres: true,
					FormatTime: true,
					SortUnique: true,
					HTML5Storage: true
				}
			},
			grunt:
			{
				src: "grunt.js",
				options:
				{
					globals: {module: true}
				}
			},
			notifications:
			{
				src: SRC.js + 'notifications.js',
				options:
				{
					globals: {$: true, Effect: true, Event: true}
				}
			},
			action:
			{
				src: SRC.js + 'action.js',
				options:
				{
					globals: {Extend: true}
				}
			},
			query:
			{
				src: SRC.js + 'query.js',
				options:
				{
					globals: {Action: true}
				}
			},
			genre:
			{
				src: SRC.js + 'genres.js'
			},
			tools:
			{
				src: SRC.js + 'tools.js',
				options: {unused: false, eqeqeq: false, eqnull: true}
			},
			storage:
			{
				src: SRC.js + 'storage.js',
				options:
				{
					globals: {Jukebox: true}
				}
			},
			fieldEditor:
			{
				src: SRC.js + 'musicFieldEditor.js',
				options:
				{
					nonstandard: true, loopfunc: true, sub: true,
					globals: {genres: true, genresOrdered: true, Event: true, TableKit: true, $: true}
				}
			},
			jukebox:
			{
				src: SRC.js + 'jukebox.js',
				options:
				{
					globals: {Extend: true, Query: true, Action: true, JukeboxUI: true, soundManager: true, Notifications: true, Ajax: true, $R: true, HTML5Storage: true}
				}
			},
			jukeboxui:
			{
				src: SRC.js + 'jukeboxUI.js',
				options:
				{
					globals: {Extend: true, Tabs: true, FormatTime: true, SearchTab: true, UploadTab: true, DebugTab: true, PlaylistTab: true, NotificationTab: true, CustomQueriesTab: true, genresOrdered: true, $: true, $$: true, $R: true, Draggable: true, Droppables: true, Element: true, Event: true, Control: true, Template: true, Notifications: true, HTML5Storage: true}
				}
			},
			tabs:
			{
				src: SRC.tab + 'tabs.js'
			},
			tab_customQueries:
			{
				src: SRC.tab + 'customQueries.js',
				options:
				{
					globals: {Tab: true, Action: true, Query: true, Class: true, Notifications: true, sendQueryProxy: true}
				}
			},
			tab_debug:
			{
				src: SRC.tab + 'debug.js',
				options:
				{
					globals: {JsonPrettyPrint: true, Tab: true, Class: true}
				}
			},
			tab_notification:
			{
				src: SRC.tab + 'notification.js'
			},
			tab_search:
			{
				src: SRC.tab + 'search.js',
				options:
				{
					globals: {Class: true, Tab: true, genres: true, Template: true, Control: true, $R: true, FormatTime: true, Draggable: true, TableKit: true, SortUnique: true}
				}
			},
			tab_upload:
			{
				src: SRC.tab + 'upload.js',
				options:
				{
					nonstandard: true, sub: true,
					globals: {MusicFieldEditor: true, Tab: true, Notifications: true, qq: true, UploadTab: true, Class: true, Template: true, TableKit: true, genres: true}
				}
			},
			tab_playlist:
			{
				src: SRC.tab + 'playlist.js',
				options:
				{
					globals: {Tab: true, Class: true, Notifications: true}
				}
			},
			skin_default:
			{
				src: SRC.skinjs + 'default.js',
				options:
				{
					multistr: true, sub: true,
					globals: {Jukebox: true}
				}
			},
			skin_light:
			{
				src: SRC.skinjs + 'light.js',
				options:
				{
					multistr: true, sub: true,
					globals: {Jukebox: true}
				}
			},
			skin_hype:
			{
				src: SRC.skinjs + 'hype.js',
				options:
				{
					multistr: true, sub: true,
					globals: {Jukebox: true}
				}
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
					SRC.img + 'icons/*.png',
					SRC.img + 'hype/*.png',
					SRC.img + 'hype/*.ttf'
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

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerMultiTask("copy", "Copy files to destination folder", function()
	{
		this.files.forEach(function(fileObj)
		{
			fileObj.src.forEach(function(fileName)
			{
				var destination = fileName.replace(SRC_DIR, fileObj.dest);
				//grunt.log.writeln("Copying " + fileName + " to " + destination);
				grunt.file.copy(fileName, destination);
				grunt.log.writeln("Copied " + fileName + " to " + destination);
			});
		});

		// Fail task if errors were logged.
		if (this.errorCount) { return false; }

		// Otherwise, print a success message.
		grunt.log.writeln(this.target + " copy done.");
	});

	grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'cssmin', 'copy']);
};
