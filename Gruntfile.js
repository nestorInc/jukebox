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
		},

		LOGIN_SRC_DIR = 'login_src/',
		LOGIN_SRC =
		{
			css:	LOGIN_SRC_DIR,
			img:	LOGIN_SRC_DIR + 'images/'
		},

		LOGIN_OUT_DIR = 'login/',
		LOGIN_OUT =
		{
			css:	LOGIN_OUT_DIR
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
					SRC.js + 'songlist.js',

					// Tabs
					SRC.js + 'tab/tabs.js',
					SRC.js + 'tab/playqueue.js',
					SRC.js + 'tab/search.js',
					SRC.js + 'tab/upload.js',
					SRC.js + 'tab/debug.js',
					SRC.js + 'tab/account.js',
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
					SRC.skinjs + 'default.js'
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
			logincss:
			{
				src: LOGIN_SRC.css + 'style.css',
				dest: LOGIN_OUT.css + 'style.css'
			},
			cssSkins: // For now, concat all skins inside a single minified file
			{
				src: [SRC.skin + 'default.css'],
				dest: OUT.skin + 'jukebox-skins.min.css'
			}
		},
		jshint:
		{
			options:
			{
				jshintrc: SRC.js + ".jshintrc"
			},
			notifications: SRC.js + 'notifications.js',
			songlist: SRC.js + 'songlist.js',
			action: SRC.js + 'action.js',
			query: SRC.js + 'query.js',
			genre: SRC.js + 'genres.js',
			tools: SRC.js + 'tools.js',
			storage: SRC.js + 'storage.js',
			fieldEditor: SRC.js + 'musicFieldEditor.js',
			jukebox: SRC.js + 'jukebox.js',
			jukeboxui: SRC.js + 'jukeboxUI.js',
			tabs: SRC.tab + 'tabs.js',
			tab_playqueue: SRC.tab + 'playqueue.js',
			tab_customQueries: SRC.tab + 'customQueries.js',
			tab_debug: SRC.tab + 'debug.js',
			tab_account: SRC.tab + 'account.js',
			tab_notification: SRC.tab + 'notification.js',
			tab_search: SRC.tab + 'search.js',
			tab_upload: SRC.tab + 'upload.js',
			tab_playlist: SRC.tab + 'playlist.js',
			skin_default: SRC.skinjs + 'default.js'
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
					SRC.img + '*.woff',
					SRC.img + '*.woff2',
					SRC.img + '*.eot',
					SRC.img + '*.ttf',
					SRC.img + '*.svg',
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
			},
			loginroot:
			{
				src:
				[
					SRC_DIR + 'favicon.ico',
					LOGIN_SRC_DIR + 'index.html'
				],
				dest: LOGIN_OUT_DIR
			},
			loginimages:
			{
				src:
				[
					LOGIN_SRC.img + '*.png',
					LOGIN_SRC.img + '*.jpg',
					LOGIN_SRC.img + '*.gif'
				],
				dest: LOGIN_OUT_DIR
			}
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
				destination = destination.replace(LOGIN_SRC_DIR, fileObj.dest);
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
