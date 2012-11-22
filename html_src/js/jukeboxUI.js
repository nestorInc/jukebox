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
	// [Public] Variables

	this.skin = JukeboxUI.defaults.skin;

	//---
	// [Private] Variables
	
	// `this` refers to current object, because we're in a "new" object creation
	// Useful for private methods and events handlers
	var $this = this,
		
		_opts = Extend(true, {}, JukeboxUI.defaults, opts), // Recursively merge options

		J = jukebox, // short jukebox reference
		_tabs = new Tabs('tab'),
		_tabsManager = {},
		_volumeSlider,
		_$, // Selectors cache

		_refreshSongTimer = null,
		_lastCurrentSongElapsedTime = null;

	if(JukeboxUI.skins[_opts.skin])
	{
		this.skin = _opts.skin;
	}
	else
	{
		_opts.skin = JukeboxUI.defaults.skin;
	}

	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)
	
	/**
	* Update the activity light to inform the user a processing is ongoing or not
	* @param {bool} status - The current activity status (true = active, false = inactive).
	*/
	this.activity = function(status)
	{
		var color = _opts.ActivityMonitorColor.inactive;
		if(status === true)
		{
			color = _opts.ActivityMonitorColor.active;
		}
		_$.activity_monitor.setStyle({backgroundColor: color});
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
			var currentSongElapsedTime = song.elapsed + (new Date().getTime() / 1000) - lastServerResponse;
			nextSongSecondIn = (Math.ceil(currentSongElapsedTime) - currentSongElapsedTime) * 1000;
			
			if(currentSongElapsedTime > song.duration) // Avoid >100%
			{
				currentSongElapsedTime = song.duration;
			}
		 
			if(_lastCurrentSongElapsedTime == null || currentSongElapsedTime > _lastCurrentSongElapsedTime)
			{
				var percent = Math.round(currentSongElapsedTime / song.duration * 100);
				_$.progressbar.setStyle({width: percent + '%'});
				_$.player_song_time.update(FormatTime(currentSongElapsedTime) + "/" + FormatTime(song.duration));
			}
			_lastCurrentSongElapsedTime = currentSongElapsedTime;
		}
		else // No song
		{
			_lastCurrentSongElapsedTime = null;
			_$.progressbar.setStyle({width: 0});
			_$.player_song_time.update("--- / ---");
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
			_$.player_song_artist.update(songObj.artist).stopObserving().on("click", function()
			{
				_searchCategory(songObj.artist, 'artist');
			});
			_$.player_song_album.update(songObj.album).stopObserving().on("click", function()
			{
				_searchCategory(songObj.album, 'album');
			});
			_$.player_song_title.update(songObj.title);

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
		var items = $$('span.count-user-listening');
		if(items.length > 0)
		{
			items.each(function(e)
			{
				e.update(count.toString());
			});
		}
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
			_$.stop_stream.style.display = 'inline';
		}
		else
		{
			_$.play_stream.show();
			_$.stop_stream.hide();
		}
	};

	this.cleanupPlayQueue = function()
	{
		var len = _$.play_queue_content.select('li').length - 1;
		for(var i = 0; i < len; ++i)
		{
			Droppables.remove('play-queue-song-' + i);
		}
	};

	/**
	* Render the current play queue
	* @param {Array<song>} playQueueSongs - The current play queue
	*/
	this.displayPlayQueue = function(playQueueSongs)
	{
		var ul = new Element('ul');
		var li = '' +
		'<li id="play-queue-li-first" class="droppable">Play queue' +
			'<div>' +
				'<span class="nb-listening-users"></span>' +
				'<span class="count-user-listening">' + J.listenersCount + '</span>' +
			'</div>' +
			'<a><span class="play-queue-shuffle"></span></a>' +
			'<a><span class="play-queue-delete"></span></a>' +
		'</li>';
		ul.insert(li);

		ul.down(".play-queue-shuffle").on("click", function()
		{
			J.playQueueShuffle();
		});
		ul.down(".play-queue-delete").on("click", function()
		{
			J.playQueueDelete();  // no args = all
		});

		var currentPQSongIndex = 0,
			lastPQIndex = playQueueSongs.length - 1;
		playQueueSongs.each(function(song)
		{
			li = '' +
			'<li id="play-queue-li-' + currentPQSongIndex + '" class="droppable">' +
				'<div id="play-queue-song-' + currentPQSongIndex + '" class="play-queue-draggable">' +
					'<div id="play-queue-handle-' + currentPQSongIndex + '" class="play-queue-handle">' +
						'<a href="javascript:void(0)">' + song.artist + '</a>' +
						' - ' +
						'<a href="javascript:void(0)">' + song.album + '</a>' +
						' - ' +
						song.title + ' (' + FormatTime(song.duration) + ')' +
					'</div>' +
					'<a><span class="play-queue-move-top"></span></a>' +
					'<a><span class="play-queue-move-bottom"></span></a>' +
					'<a><span class="play-queue-delete"></span></a>' +
				'</div>' +
			'</li>';
			ul.insert(li);

			// Store mid
			ul.down('li:last > div').store('mid', song.mid);

			// Declare listeners

			// Artist
			ul.down('li:last .play-queue-handle a:first').on("click", function()
			{
				_search(1, null, null, song.artist, 'equal', 'artist', 'artist,album,track,title', 20, false);
			});
			// Album
			ul.down('li:last .play-queue-handle a:last').on("click", function()
			{
				_search(1, null, null, song.album, 'equal', 'album', 'artist,album,track,title', 20, false);
			});

			var localcurrentPQSongIndex = currentPQSongIndex; // Avoid closure issue
			ul.down('li:last .play-queue-move-top').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, 0);
			});
			ul.down('li:last .play-queue-move-bottom').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, lastPQIndex);
			});
			ul.down('li:last .play-queue-delete').on("click", function()
			{
				J.playQueueDelete(1, localcurrentPQSongIndex);
			});

			currentPQSongIndex++;
		});
		
		_$.play_queue_content.update(ul);
		
		// Create all draggables, once update is done.
		for(var i = 0, len = playQueueSongs.length; i < len; i++)
		{
			new Draggable('play-queue-song-' + i,
			{
				scroll: window,
				constraint: 'vertical',
				revert: true,
				handle: 'play-queue-handle-' + i,
				onStart: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play-queue-li-' + id).addClassName('being-dragged');
				},
				onEnd: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play-queue-li-' + id).removeClassName('being-dragged');
				}
			});
			_makePlayQueueSongDroppable('play-queue-li-' + i, playQueueSongs);
		}
		_makePlayQueueSongDroppable('play-queue-li-first', playQueueSongs);
	};

	/**
	* Render results of a search
	* @param {object} results - Results sent by server
	*/
	this.displaySearchResults = function(results)
	{
		// A new search could be initiated from the left pannel so we must automatically expand the right pannel
		_expand();

		// Create a new searchTab
		if(!results.identifier)
		{
			// Adds the new created tab to the tabs container
			var searchTab = new SearchTab(J, results);
			var id = _tabs.addTab(searchTab);
			if(results.select !== false)
			{
				_tabs.toggleTab(id);
			}
		}
		else
		{
			// If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed results
			_tabs.getTabFromUniqueId(results.identifier).updateNewSearchInformations(results);
			_tabs.getTabFromUniqueId(results.identifier).updateContent();
		}
	};

	/**
	* Update the debug tab when sending a query
	* @param {Query} query - The query we're going to send
	*/
	this.sendingQuery = function(query)
	{
		var tab = _tabs.getFirstTabByClassName("DebugTab");
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
		/*TODO: use syntax like that?
		if(TabManager.DebugTag.isDisplayed())
		{
			TabManager.DebugTag.updateResponse(null);
		}
		*/

		var tab = _tabs.getFirstTabByClassName("DebugTab");
		if(tab)
		{
			tab.updateResponse(response);
		}
	};

	/**
	* Display uploaded files
	* @param {Array<file>} uploaded_files - The files that have been uploaded
	*/
	this.displayUploadedFiles = function(uploaded_files)
	{
		//TODO: TabManager.UploadTab
		var tab = _tabs.getFirstTabByClassName("UploadTab");
		if(tab)
		{
			tab.treatResponse(uploaded_files);
		}
	};

	//-----
	// [Private] Functions
	
	/**
	* Show full player
	*/
	function _expand()
	{
		_$.tabs.style.display = 'inline';
		_$.expand_button.hide();
		_$.collapse_button.style.display = 'block'; // .show is stupid (ignores css)
		_$.jukebox.setStyle({width: '900px'});
	}

	/**
	* Show mini player
	*/
	function _collapse()
	{
		_$.tabs.hide();
		_$.expand_button.show();
		_$.collapse_button.hide();
		_$.jukebox.setStyle({width: '280px'});
	}

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
		J.search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select);
	}

	/**
	 * Helper to do a search in a specific category
	 * @param {string} search - The text search
	 * @param {string} category - artist or album
	 */
	function _searchCategory(search, category)
	{
		_search(1, null, null, search, 'equal', category, 'artist,album,track,title', null, false);
	}

	/**
	* Make play queue songs droppables
	* @param {int} droppable_id - The element id to make droppable (same as draggable)
	* @param {Array<song>} playQueueSongs - The play queue
	*/
	function _makePlayQueueSongDroppable(droppable_id, playQueueSongs)
	{
		Droppables.add(droppable_id,
		{ 
			accept: ['play-queue-draggable', 'library-draggable'],
			overlap: 'vertical',
			hoverclass: 'droppable-hover',
			onDrop: function(dragged, dropped/*, event*/)
			{
				var old_index,
					song_mid;
				if(dragged.hasClassName("play-queue-draggable"))
				{
					old_index = parseInt(dragged.id.substring(16), 10);
					song_mid = dragged.retrieve('mid');
					
					var new_index = -1;
					if(dropped.id != "play-queue-li-first")
					{
						new_index = parseInt(dropped.id.substring(14), 10);
					}
					if(new_index <= old_index)
					{
						new_index++;
					}
					if(new_index != old_index)
					{
						J.playQueueMove(song_mid, old_index, new_index);
						
						$this.cleanupPlayQueue();
						var tmp = playQueueSongs[old_index];
						playQueueSongs.splice(old_index, 1);
						playQueueSongs.splice(new_index, 0, tmp);						
						$this.displayPlayQueue(playQueueSongs);
					}
				}
				else if(dragged.hasClassName("library-draggable"))
				{
					var idregexp = new RegExp(".*-([^\\-]*-[^\\-]*)-([0-9]*)");
					var tab_index = dragged.id.replace(idregexp, "$1");
					old_index = parseInt(dragged.id.replace(idregexp, "$2"), 10);
					var song = _tabs.getTabFromUniqueId(tab_index).server_results[old_index];
					song_mid = song.mid;
					
					var play_queue_index = -1;
					if(dropped.id != "play-queue-li-first")
					{
						play_queue_index = parseInt(dropped.id.substring(14), 10);
					}
					play_queue_index++;

					J.addToPlayQueue(song_mid, play_queue_index);

					playQueueSongs.splice(play_queue_index, 0, song);
					$this.displayPlayQueue(playQueueSongs);
				}
			}
		});
	}

	//---
	// Events handlers

	var _events = // UI actions trigger thoses events
	{
		expand: function()
		{
			_expand();
		},
		collapse: function()
		{
			_collapse();
		},
		joinChannel: function()
		{
			J.joinChannel(_$.channel.value);
		},
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
		autoRefreshChange: function()
		{
			J.autoRefresh(_$.cb_autorefresh.getValue());
		},
		refresh: function()
		{
			J.refresh();
		},
		plugin: function()
		{
			J.plugin(_$.selection_plugin.value);
		}
	};
	
	/**
	* @constructs
	*/
	(function()
	{
		Object.seal($this); // Non-extensible, Non-removable

		// Create HTML player
		var $elem = $(element);
		try
		{
			var skin = JukeboxUI.skins[_opts.skin],
			songTpl = new Template(skin.templates.song),
			jukeboxTpl = new Template(skin.templates.player),
			jukeboxTplVars =
			{
				currentSong: songTpl.evaluate(),
				canalLabel: 'Canal :',
				canalValue: 'Rejoindre',
				searchLabel: 'Rechercher :',
				searchButton: 'Rechercher',
				UploadTabName: 'Upload',
				QueryTabName: 'Query',
				NotificationsTabName: 'Notifications',
				DebugTabName: 'Debug',
				artiste: 'artiste',
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
				volume: 'Volume :'
			};
			$elem.insert(jukeboxTpl.evaluate(jukeboxTplVars)); // DOM insertion ; Only location where element is modified
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
			jukebox: 			$JB,
			tabs: 				$JB.down(rootClass+'tabs'),
			expand_button: 		$JB.down(rootClass+'expand-button'),
			collapse_button: 	$JB.down(rootClass+'collapse-button'),
			search_input: 		$JB.down(rootClass+'search-input'),
			search_field: 		$JB.down(rootClass+'search-field'),
			search_genres: 		$JB.down(rootClass+'search-genres'),
			results_per_page: 	$JB.down(rootClass+'results-per-page'),
			btn_search: 		$JB.down(rootClass+'search-button'),
			progressbar: 		$JB.down(rootClass+'progressbar'),
			player_song_time: 	$JB.down(rootClass+'song-time'),
			activity_monitor: 	$JB.down(rootClass+'activity-monitor'),
			play_stream: 		$JB.down(rootClass+'stream-play'),
			stop_stream: 		$JB.down(rootClass+'stream-stop'),
			channel: 			$JB.down(rootClass+'channel'),
			btn_join_channel: 	$JB.down(rootClass+'channel-button'),
			previous_button: 	$JB.down(rootClass+'previous-button'),
			next_button: 		$JB.down(rootClass+'next-button'),
			cb_autorefresh: 	$JB.down(rootClass+'autorefresh'),
			btn_refresh: 		$JB.down(rootClass+'refresh-button'),
			player_song_artist: $JB.down(rootClass+'song-artist'),
			player_song_album: 	$JB.down(rootClass+'song-album'),
			player_song_title: 	$JB.down(rootClass+'song-title'),
			play_queue_content: $JB.down(rootClass+'playqueue-content'),
			selection_plugin: 	$JB.down(rootClass+'plugin'),
			btn_apply_plugin: 	$JB.down(rootClass+'plugin-button'),
			volume_box_slider: 	$JB.down(rootClass+'volume-slider'),
			tabs_links: 		$JB.down(rootClass+'tabs-links')
		};

		_tabs.setRootNode(_$.tabs);

		// Register listeners
		_$.expand_button.on("click", _events.expand);
		_$.collapse_button.on("click", _events.collapse);

		_$.play_stream.on("click", _events.playStream);
		_$.stop_stream.on("click", _events.stopStream);

		_$.btn_join_channel.on("click", _events.joinChannel);
		_$.btn_search.on("click", _events.search);
		_$.search_field.on("change", _events.selectAndFillGenres);
		_$.search_input.observe("keypress", _events.searchInputKeyPress);

		_$.previous_button.on("click", _events.previousSong);
		_$.next_button.on("click", _events.nextSong);

		_$.cb_autorefresh.on("change", _events.autoRefreshChange);
		_$.btn_refresh.on("click", _events.refresh);

		_$.btn_apply_plugin.on("click", _events.plugin);

		var range0to100 = $R(0, 100);
		_volumeSlider = new Control.Slider(_$.volume_box_slider.down(rootClass+'volume-handle'), _$.volume_box_slider,
		{
			range: range0to100,
			values: range0to100,
			sliderValue: 100, // Hardcoded because we can't call J.volume() right now (flash not yet loaded)
			onSlide: _events.volume,
			onChange: _events.volume // Mostly for click anywhere on the slider
		});

		(function() // Tabs
		{
			function createShowTab(tab)
			{
				_tabsManager["Show" + tab.classN] = function()
				{
					var identifier = _tabs.getFirstTabIdentifierByClassName(tab.classN);
					if(identifier == null)
					{
						var newTab = new tab.classC(tab.identifier, tab.name, J);
						identifier = _tabs.addTab(newTab);
					}
					_tabs.toggleTab(identifier);
				};
			}
			
			var possibleTabs =
			[
				{
					classN: "UploadTab",
					classC: UploadTab,
					identifier: "Uploader",
					name: "Uploader"
				},
				{
					classN: "DebugTab",
					classC: DebugTab,
					identifier: "Debug",
					name: "Debug"
				},
				{
					classN: "NotificationTab",
					classC: NotificationTab,
					identifier: "Notifications",
					name: "Notifications"
				},
				{
					classN: "CustomQueriesTab",
					classC: CustomQueriesTab,
					identifier: "Custom queries",
					name: "Custom queries"
				}
			];

			for(var i = 0; i < possibleTabs.length; ++i)
			{
				createShowTab(possibleTabs[i]);
			}

			var TL = _$.tabs_links;
			TL.down('.tab-upload').on("click", _tabsManager.ShowUploadTab);
			TL.down('.tab-query').on("click", _tabsManager.ShowCustomQueriesTab);
			TL.down('.tab-notifs').on("click", _tabsManager.ShowNotificationTab);
			TL.down('.tab-debug').on("click", _tabsManager.ShowDebugTab);
		})();
	})();
}

//---

/** [Static] Variables
* @property {string} ActivityMonitorColor.active - Monitor color when active
* @property {string} ActivityMonitorColor.inactive - Monitor color when inactive
*/
JukeboxUI.defaults =
{
	ActivityMonitorColor:
	{
		active: "orange",
		inactive: "green"
	},
	skin: 'default',
	rootClass: 'jukebox' // CSS begins with ".jukebox-"
};

JukeboxUI.skins =
{
	"default":
	{
		templates:
		{
			player:
'<div class="jukebox">\
	<div class="jukebox-header">\
		#{canalLabel} <input type="text" class="jukebox-channel" /><input type="button" class="jukebox-channel-button" value="#{canalValue}" />\
		<span class="jukebox-expand-button">&gt;</span>\
		<span class="jukebox-collapse-button">&lt;</span>\
		<span class="jukebox-activity-monitor"></span>\
	</div>\
	<div class="jukebox-main">\
		<div class="jukebox-controls">\
			<span class="jukebox-previous-button"></span><span class="jukebox-next-button"></span>\
			#{currentSong}\
			<div class="jukebox-progressbar-wrapper">\
				<div class="jukebox-progressbar"></div>\
				<p class="jukebox-song-time"></p>\
			</div>\
		</div>\
		<div class="jukebox-playqueue">\
			<div class="jukebox-playqueue-content"></div>\
		</div>\
	</div>\
	\
	<div class="jukebox-tabs">\
		<div class="jukebox-tabs-links">\
			<a class="tab-upload">#{UploadTabName}</a>\
			<a class="tab-query">#{QueryTabName}</a>\
			<a class="tab-notifs">#{NotificationsTabName}</a>\
			<a class="tab-debug">#{DebugTabName}</a>\
		</div>\
		<div class="jukebox-tabs-head">\
			#{searchLabel} <input type="text" class="jukebox-search-input" />\
			<select class="jukebox-search-genres" style="display:none;"></select>\
			<select class="jukebox-search-field">\
				<option value="artist">#{artiste}</option>\
				<option value="title">#{title}</option>\
				<option value="album">#{album}</option>\
				<option value="genre">#{genre}</option>\
			</select> \
			<select class="jukebox-results-per-page">\
				<option value="10">10</option>\
				<option value="20" selected="selected">20</option>\
				<option value="30">30</option>\
				<option value="40">40</option>\
				<option value="50">50</option>\
				<option value="60">60</option>\
				<option value="70">70</option>\
				<option value="80">80</option>\
				<option value="90">90</option>\
				<option value="100">100</option>\
			</select> \
			<input type="button" class="jukebox-search-button" value="#{searchButton}" />\
		</div>\
		<div class="jukebox-tabs-header"></div>\
		<div class="jukebox-tabs-content"></div>\
	</div>\
	\
	<div class="jukebox-footer">\
		<input type="button" class="jukebox-refresh-button" value="#{refreshButton}" />\
		<input type="checkbox" name="jukebox-autorefresh" class="jukebox-autorefresh" checked="checked" value="autorefresh" /><label for="jukebox-autorefresh"> #{refreshLabel}</label>\
		<br />\
		#{pluginLabel} <input type="text" class="jukebox-plugin" value="#{pluginDefault}" style="width: 100px;" />\
		<input type="button" class="jukebox-plugin-button" value="#{pluginButton}" />\
	</div>\
	\
	<div class="jukebox-stream">\
		<a class="jukebox-stream-play">#{play}</a>\
		<a class="jukebox-stream-stop">#{stop}</a>\
	</div>\
	<span class="jukebox-volume">\
		<span>#{volume}&nbsp;</span>\
		<div class="jukebox-volume-slider slider">\
			<div class="jukebox-volume-handle handle"></div>\
		</div>\
		<br clear="all" />\
	</span>\
</div>',
			song:
'<p class="jukebox-song">\
	<a class="jukebox-song-artist" href="#">#{artist}</a> - \
	<a class="jukebox-song-album" href="#">#{album}</a> - \
	<span class="jukebox-song-title">#{song}</span>\
</p>',
			playQueue: '',
			playQueueSongs: ''
		}
	}
};

Object.freeze(JukeboxUI); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(JukeboxUI.prototype); // 1337 strict mode
