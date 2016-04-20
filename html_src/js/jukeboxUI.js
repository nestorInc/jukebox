/* global Extend, Tabs, TabsManager, FormatTime, SearchTab, PlayQueueTab, UploadTab, DebugTab, AccountTab, PlaylistTab, NotificationTab, CustomQueriesTab, genresOrdered, $, $$, $R, Event, Notifications, SetCookie */

/**
* Represents a Jukebox graphical interface.
* @constructor
* @param {object} jukebox - The jukebox instance.
* @param {string} element - The DOM element that contains the jukebox.
* @param {object} [opts] - The facultative options.
* @return {JukeboxUI} The JukeboxUI object.
*/
function JukeboxUI(jukebox, element, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new JukeboxUI(element, opts);
	}

	//---
	// [Private] Variables

	// `this` refers to current object, because we're in a "new" object creation
	// Useful for private methods and events handlers
	var $this = this,
		$elem = $(element),

		_opts = Extend(true, {}, JukeboxUI.defaults, opts), // Recursively merge options

		J = jukebox, // short jukebox reference
		_tabs = null,
		_skin = null,
		_volumeSlider,
		_$, // Selectors cache

		_refreshSongTimer = null,
		_lastCurrentSongElapsedTime = null;

	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)

	/**
	* Update the activity light to inform the user a processing is ongoing or not
	* @param {bool} status - The current activity status (true = active, false = inactive).
	*/
	this.activity = function(status)
	{
		var on = _opts.rootClass + '-activity-on',
			off = _opts.rootClass + '-activity-off',
			add = off,
			remove = on;
		if(status === true)
		{
			add = on;
			remove = off;
		}
		_$.activity_monitor.removeClassName(remove);
		_$.activity_monitor.addClassName(add);
	};

	/**
	* @param {int|string} [volume] - The volume to display.
	*/
	this.volume = function(volume)
	{
		_volumeSlider.setValue(volume);
	};

	/**
	* Update the song time (progressbar + chrono)
	* @param {object} songObj - The current song to display.
	* @param {date} lastServerResponse - The last server response timestamp on client side.
	*/
	this.updateSongTime = function(song, lastServerResponse)
	{
		if(_refreshSongTimer)
		{
			clearTimeout(_refreshSongTimer);
		}

		//---

		// Rather than calling updateSongTime() every 100ms as before (+when manual call after a json response),
		// only call when necessary: each time the display needs to be updated = every second (of the song)
		//		=> less refresh calls
		// default value = refresh frequency when there is no song
		var nextSongSecondIn = 100; // in ms

		if(song)
		{
			var currentSongElapsedTime = song.elapsed;
			if( J.listenersCount > 0 ) {
				currentSongElapsedTime += + (new Date().getTime() / 1000) - lastServerResponse;
			}
			nextSongSecondIn = (Math.ceil(currentSongElapsedTime) - currentSongElapsedTime) * 1000;

			if(currentSongElapsedTime > song.duration) // Avoid >100%
			{
				currentSongElapsedTime = song.duration;
			}

			if(_lastCurrentSongElapsedTime === null || currentSongElapsedTime > _lastCurrentSongElapsedTime)
			{
				var percent = Math.round(currentSongElapsedTime / song.duration * 100);
				_$.progressbar.setStyle({width: percent + '%'});
				_$.song_time.update(FormatTime(currentSongElapsedTime)); // song.elapsed is updated only on ajax
				_$.song_remaining_time.update(FormatTime(song.duration - currentSongElapsedTime));
				_$.song_total_time.update(FormatTime(song.duration));
			}
			_lastCurrentSongElapsedTime = currentSongElapsedTime;
		}
		else // No song
		{
			_lastCurrentSongElapsedTime = null;
			_$.progressbar.setStyle({width: 0});
			_$.song_time.update("---");
			_$.song_total_time.update("---");
		}

		//---

		_refreshSongTimer = setTimeout(function()
		{
			$this.updateSongTime(song, lastServerResponse);
		}, nextSongSecondIn + 1); // +1ms to be extra sure that a second has passed
	};

	/**
	* Update the song artist, album and title
	* @param {object} songObj - The current song to display.
	*/
	this.updateCurrentSong = function(songObj)
	{
		if(songObj)
		{
			var that = this;
			_$.song_artist.update(songObj.artist).stopObserving().on("click", function(evt)
			{
				that.searchCategory(songObj.artist, 'artist', evt);
			});
			_$.song_album.update(songObj.album).stopObserving().on("click", function(evt)
			{
				that.searchCategory(songObj.album, 'album', evt);
			});
			_$.song_title.update(songObj.title);

			// Change the page title with the current song played
			if(_opts.replaceTitle)
			{
				document.title = "Jukebox - " + songObj.artist + " - " + songObj.album + " - " + songObj.title;
			}
		}
	};

	/**
	* Update the current number of listeners
	* @param {int} count - Number of users listening to the channel.
	*/
	this.updateNbUsers = function(count)
	{
		var items = _$.jukebox.select('.'+_opts.rootClass+'-listening-count');
		items.each(function(e)
		{
			e.update(count.toString());
		});
	};

	this.updateUser = function(userName)
	{
		var items = _$.jukebox.select('.'+_opts.rootClass+'-user-display');
		items.each(function(e)
		{
			e.update(userName);
		});
	};

	/**
	* Update the playing status
	* @param {bool} audio - It is playing?
	*/
	this.playing = function(audio)
	{
		if(audio)
		{
			_$.play_stream.hide();
			_$.stop_stream.show();
		}
		else
		{
			_$.play_stream.show();
			_$.stop_stream.hide();
		}
	};

	/**
	* Render the current play queue
	* @param {Array<song>} playQueueSongs - The current play queue
	*/
	this.displayPlayQueue = function(playQueueSongs)
	{
		var playQueue = _tabs.getFirstTabByClass(PlayQueueTab);
		if (playQueue)
		{
			playQueue.setSongs(playQueueSongs);
		}
	};

	/**
	* Render results of a search
	* @param {object} results - Results sent by server
	*/
	this.displaySearchResults = function(results)
	{
		var tab = null;
		if(results.identifier)
		{
			// If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed results
			tab = _tabs.getTabFromUniqueId(results.identifier);
		}

		if(tab)
		{
			tab.updateNewSearchInformations(results);
			tab.updateContent(tab.DOM);
		}
		else
		{
			// Adds the new created tab to the tabs container
			var searchTab = new SearchTab(results, _opts.rootClass, J, _skin.templates.tabs ? _skin.templates.tabs["SearchTab"] : null);
			var id = _tabs.addTab(searchTab, "SearchTab");
			if(results.select !== false)
			{
				_tabs.toggleTab(id);
			}
		}
	};

	/**
	* Update the debug tab when sending a query
	* @param {Query} query - The query we're going to send
	*/
	this.sendingQuery = function(query)
	{
		var tab = _tabs.getFirstTabByClass(DebugTab);
		if(tab)
		{
			tab.updateSendingQuery(query);
		}
	};

	/**
	* Update the debug tab when receiving a query
	* @param {object} response - AJAX response
	*/
	this.gotResponse = function(response)
	{
		var tab = _tabs.getFirstTabByClass(DebugTab);
		if(tab && _tabs.isTabActive(tab.identifier))
		{
			tab.updateResponse(response);
		}
	};

	/**
	* Display account informations
	* @param {Array<file>}
	*/
	this.displayAccount = function(infos)
	{
		this.updateUser(infos.nickname);
		var tab = _tabs.getFirstTabByClass(AccountTab);
		if(tab)
		{
			tab.treatResponse(infos);
		}
	};

	/**
	* Display uploaded files
	* @param {Array<file>} uploaded_files - The files that have been uploaded
	*/
	this.displayUploadedFiles = function(uploaded_files)
	{
		var tab = _tabs.getFirstTabByClass(UploadTab);
		if(tab)
		{
			tab.treatResponse(uploaded_files);
		}
	};

	/**
	* Get/Set the skin
	* @param {string} [name] - Skin to set
	* @return {string} The current skin.
	*/
	this.skin = function(name)
	{
		if(arguments.length > 0 && name && name != _opts.skin)
		{
			// Set new skin
			if(JukeboxUI.skins[name]) // Skin exists
			{
				_skin = JukeboxUI.skins[name];
				_skin.themes  = _skin.themes || []; // Ensure validity even if no theme specified
				_opts.skin = name;
			}
			else // Invalid _opts.skin
			{
				throw new Error('Invalid skin');
			}

			// If already a skin remove it
			var $JB = $elem.down('.' + _opts.rootClass);
			if($JB)
			{
				$JB.remove();
			}

			// Ensure params default values
			_skin.params = Extend(true, {}, JukeboxUI.defaults.skinParams, _skin.params);

			// Set theme
			_opts.theme = _skin.themes.indexOf(_opts.theme) == -1 ? _skin.defaultTheme : _opts.theme;

			// One distinct CSS per skin
			_opts.rootClass = _opts.rootCSS + (_opts.skin == JukeboxUI.defaults.skin ? '' : ('-' + _opts.skin));

			_init();
		}
		return _opts.skin;
	};

	/**
	* Get/Set the theme
	* @param {string} [name] - Theme to set
	* @return {string} The current theme.
	*/
	this.theme = function(name)
	{
		if(arguments.length > 0 && name && name != _opts.theme)
		{
			if(_skin.themes.indexOf(name) == -1)
			{
				throw new Error('Invalid theme');
			}
			else
			{
				var prefix = _opts.rootClass + '-theme-';
				_$.jukebox.removeClassName(prefix + _opts.theme);
				_opts.theme = name;
				_$.jukebox.addClassName(prefix + _opts.theme);
			}
		}
		return _opts.theme;
	};

	/**
	* Helper to do a search in a specific category
	* @param {string} search - The text search
	* @param {string} category - artist or album
	* @param {int} mouseEvent - Clic event to detect left/middle click
	*/
	this.searchCategory = function(search, category, mouseEvent)
	{
		var focusTab = (mouseEvent.which == 2 || mouseEvent.ctrlKey) ? false : true; // Open in background with middle clic or ctrl+clic

		var orderby = 'artist,album,track,title';
		if (category == 'album')
		{
			orderby = 'track,title'/*,artist*/;
		}

		_search(1, null, null, search, 'equal', category, orderby, null, focusTab);
	};

	//-----
	// [Private] Functions

	/**
	* Do a search
	*/
	function _search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select)
	{
		if(!search_field)
		{
			search_field = _$.search_field.value;
		}
		if(!search_value)
		{
			if(search_field != 'genre')
			{
				search_value = _$.search_input.value;
			}
			else
			{
				search_value = _$.search_genres.value;
			}
		}
		if(!result_count)
		{
			result_count = _$.results_per_page.value;
		}
		if(typeof select == "undefined")
		{
			select = true;
		}
		J.search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select);
	}

	//---
	// Events handlers

	var _events = // UI actions trigger thoses events
	{
		previousSong: function()
		{
			J.previous();
		},
		nextSong: function()
		{
			J.next();
		},
		playStream: function()
		{
			J.start();
		},
		stopStream: function()
		{
			J.stop();
		},
		volume: function(val)
		{
			if(J.volume() != val) // Avoid infinite loop with .onChange
			{
				J.volume(val);
			}
		},
		search: function()
		{
			_search(); // no params
		},
		searchInputKeyPress: function(event)
		{
			if(event.keyCode == Event.KEY_RETURN)
			{
				_search();
				Event.stop(event);
			}
		},

		disconnect: function()
		{
			// Todo send a request to clean session
			// Todo reset account tab informations
			SetCookie("user", "", 0, "/");
			SetCookie("session", "", 0, "/");
			// Reset jukebox
			window.location = window.location.protocol + "//void:void@" + window.location.host + window.location.pathname;
		},

		/**
		* Display the select_genre input in place of input_value if the selected field is genre.
		* Also fills the select_genre list if empty.
		*/
		selectAndFillGenres: function()
		{
			if(_$.search_field.options[_$.search_field.selectedIndex].value =='genre')
			{
				if(_$.search_genres.options.length === 0) // Fill it, before display
				{
					for(var i = 0, len = genresOrdered.length; i < len; ++i)
					{
						var genre = genresOrdered[i];
						var option = document.createElement('option');
						option.value = genre.id;
						option.appendChild(document.createTextNode(genre.name));
						_$.search_genres.appendChild(option);
					}
				}

				_$.search_input.hide();
				_$.search_genres.show();
			}
			else
			{
				_$.search_input.show();
				_$.search_genres.hide();
			}
		},
		plugin: function()
		{
			J.plugin(_$.selection_plugin.value);
		},
		createAccountHeader: function()
		{
			var nick = _$.jukebox.down("."+ _opts.rootClass +"-user-header-create-nickname").value,
				pwd1 = _$.jukebox.down("."+ _opts.rootClass +"-user-header-create-password").value,
				pwd2 = _$.jukebox.down("."+ _opts.rootClass +"-user-header-create-password2").value;
			if( pwd1 != pwd2 )
			{
				Notifications.Display(Notifications.LEVELS.error, "Passwords are differents");
			}
			else
			{
				J.sendCreateAccountRequest(nick, pwd1);
			}
		}
	};

	function _init()
	{
		// Create HTML player
		try
		{
			var jukeboxTpl = new Template(_skin.templates.player),
			jukeboxTplVars =
			{
				root: _opts.rootClass,
				theme: _opts.theme,
				canalLabel: 'Canal',
				canalValue: 'Rejoindre',
				welcomeLabel: 'Bienvenue :',
				user: J.user,
				decoLabel: 'Deconnexion',
				signIn: 'Inscription',
				LogIn: 'Log-in',
				searchLabel: 'Rechercher :',
				searchButton: 'Rechercher',
				AccountTabName: 'Account',
				UploadTabName: 'Upload',
				QueryTabName: 'Query',
				NotificationsTabName: 'Notifications',
				DebugTabName: 'Debug',
				PlaylistTabName: 'Playlists',
				artist: 'artiste',
				title: 'title',
				album: 'album',
				genre: 'genre',
				refreshButton: 'Refresh',
				refreshLabel: 'Autorefresh',
				pluginLabel: 'Plugin :',
				pluginDefault: 'default',
				pluginButton: 'Appliquer',
				play: 'Play stream',
				stop: 'Stop stream',
				volume: 'Volume :',
				listenersCount: J.listenersCount
			};
			$elem.update(jukeboxTpl.evaluate(jukeboxTplVars)); // DOM insertion ; Only location where $elem is modified
			$elem.up(1).setStyle({backgroundColor: _skin.params.backgroundColor});
		}
		catch(skinEx)
		{
			var skinErr = "Invalid skin: " + skinEx.message;
			Notifications.Display(Notifications.LEVELS.error, skinErr);
			throw new Error(skinErr);
		}

		// Create selectors cache
		var rootClass = '.' + _opts.rootClass + '-',
			$JB = $elem.down('.' + _opts.rootClass);
		_$ =
		{
			jukebox:			$JB,
			tabs:				$JB.down(rootClass+'tabs'),
			tabs_content:		$JB.down(rootClass+'tabs-content'),
			deco_link:			$JB.down(rootClass+'user-header-deco'),
			search_input:		$JB.down(rootClass+'search-input'),
			search_field:		$JB.down(rootClass+'search-field'),
			search_genres:		$JB.down(rootClass+'search-genres'),
			results_per_page:	$JB.down(rootClass+'results-per-page'),
			btn_search:			$JB.down(rootClass+'search-button'),
			progressbar:		$JB.down(rootClass+'progressbar'),
			song_time:			$JB.down(rootClass+'song-time'),
			song_remaining_time:$JB.down(rootClass+'song-remaining-time'),
			song_total_time:	$JB.down(rootClass+'song-total-time'),
			activity_monitor:	$JB.down(rootClass+'activity'),
			play_stream:		$JB.down(rootClass+'stream-play'),
			stop_stream:		$JB.down(rootClass+'stream-stop'),
			previous_button:	$JB.down(rootClass+'previous-button'),
			next_button:		$JB.down(rootClass+'next-button'),
			song_artist:		$JB.down(rootClass+'song-artist'),
			song_album:			$JB.down(rootClass+'song-album'),
			song_title:			$JB.down(rootClass+'song-title'),
			selection_plugin:	$JB.down(rootClass+'plugin'),
			volume_box_slider:	$JB.down(rootClass+'volume-slider'),
			header_account:		$JB.down(rootClass+'user-header-create'),
			sign_in_link:		$JB.down(rootClass+'user-header-signin'),
			create_account_submit:	$JB.down(rootClass+'user-header-create-submit')
		};
		// Initial visibility state
		_$.stop_stream.hide();

		// Make selector facultative (for some skins)
		var dummyElement = new Element('p');
		for(var selector in _$)
		{
			if(!_$[selector])
			{
				_$[selector] = dummyElement;
			}
		}

		// Register listeners
		_$.deco_link.on("click", _events.disconnect);

		_$.play_stream.on("click", _events.playStream);
		_$.stop_stream.on("click", _events.stopStream);

		_$.btn_search.on("click", _events.search);
		_$.search_field.on("change", _events.selectAndFillGenres);
		_$.search_input.observe("keypress", _events.searchInputKeyPress);

		_$.previous_button.on("click", _events.previousSong);
		_$.next_button.on("click", _events.nextSong);

		var range0to100 = $R(0, 100);
		_volumeSlider = new Control.Slider(_$.volume_box_slider.down(rootClass+'slider-handle'), _$.volume_box_slider,
		{
			range: range0to100,
			values: range0to100,
			sliderValue: 100, // Hardcoded because we can't call J.volume() right now (flash not yet loaded)
			onSlide: _events.volume,
			onChange: _events.volume // Mostly for click anywhere on the slider
		});

		if(_skin.params.allowTabs)
		{
			// Instanciate the Tabs control
			_tabs = new Tabs(_$.tabs, _$.tabs_content, _opts.rootClass);

			// Collection of tab name -> tab class
			var availableTabs =
			{
				"UploadTab": UploadTab,
				"DebugTab": DebugTab,
				"AccountTab": AccountTab,
				"NotificationTab": NotificationTab,
				"CustomQueriesTab": CustomQueriesTab,
				"PlaylistTab": PlaylistTab,
				"PlayQueueTab": PlayQueueTab
			};
			var tabsM = new TabsManager(_opts.rootClass, J, availableTabs, _tabs, _skin.templates.tabs);

			// Register listeners
			$$('.toggle-category-container').each(function(elt) {
				var button = elt.down('.toggle-category-container-button');
				button.observe('click', function(){
						elt.select('.toggle-category-item').each(function(item){
								item.toggle();
							});
					});
			});


			setTimeout(function()
			{
				tabsM.createDefaultTabs();
				tabsM.restoreTabs();
				tabsM.toggleTab(_skin.params.defaultTab);
			}, 0); // Avoid issue when restoring tab on jukebox instanciation (_ui undefined in jukebox.js because _init() not finished yet)
		}
	}

	//---
	// Do this once

	Object.seal($this); // Non-extensible, Non-removable

	var temp = _opts.skin;
	_opts.skin = null; // Force null to bypass `name != _opts.skin` check in .skin() method
	this.skin(temp); // Will call _init()
}

//---

/** [Static] Variables
*/
JukeboxUI.defaults =
{
	skin: 'default',
	rootCSS: 'jukebox', // CSS begins with ".jukebox-"
	skinParams:
	{
		allowTabs: false,
		dragdrop: true,
		defaultTab: 'PlayQueueTab',
		backgroundColor: 'white'
	}
};

JukeboxUI.skins = {}; // See skin/*.js

Object.freeze(JukeboxUI); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(JukeboxUI.prototype); // 1337 strict mode
