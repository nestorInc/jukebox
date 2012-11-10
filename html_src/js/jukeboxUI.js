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

	this.skin = JukeboxUI.skins[0];

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

		_refreshSongTimer = null,
		_lastCurrentSongElapsedTime = null;

	// Selectors cache
	var _$ =
	{
		elem: $(element),
		music_wrapper: $('music-wrapper'), // TODO: replace thoses id by (sub)classes
		expand_button: $('expand-button'),
		collapse_button: $('collapse-button'),
		page_wrapper: $('page-wrapper'),
		search_input: $('search-input'),
		search_field: $('search-field'),
		search_genres: $('search-genres'),
		results_per_page: $('results-per-page'),
		btn_search: $('btn-search'),
		progressbar: $('progressbar'),
		player_song_time: $('player-song-time'),
		activity_monitor: $('activity-monitor'),
		play_stream: $('play-stream'),
		stop_stream: $('stop-stream'),
		channel: $('channel'),
		btn_join_channel: $('btn-join-channel'),
		previous_button: $('previous-button'),
		next_button: $('next-button'),
		cb_autorefresh: $('cb-autorefresh'),
		btn_refresh: $('btn-refresh'),
		player_song_artist: $('player-song-artist'),
		player_song_album: $('player-song-album'),
		player_song_title: $('player-song-title'),
		play_queue_content: $('play-queue-content'),
		selection_plugin: $('music-selection-plugin'),
		btn_apply_plugin: $('btn-apply-plugin'),
		volume_box_slider: $('volume-box-slider')
	};

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

	this.sendingQuery = function(query)
	{
		var tab = _tabs.getFirstTabByClassName("DebugTab");
		if(tab)
		{
			tab.updateSendingQuery(query);
		}
	};

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
	
	function _expand()
	{
		_$.music_wrapper.style.display = 'inline';
		_$.expand_button.hide();
		_$.collapse_button.style.display = 'block'; // .show is stupid (ignores css)
		_$.page_wrapper.setStyle({width: '900px'});
	}

	function _collapse()
	{
		_$.music_wrapper.hide();
		_$.expand_button.show();
		_$.collapse_button.hide();
		_$.page_wrapper.setStyle({width: '280px'});
	}

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

	function _searchCategory(search, category)
	{
		_search(1, null, null, search, 'equal', category, 'artist,album,track,title', null, false);
	}

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
	
	//---
	// Constructor
	
	function _initialize()
	{
		Object.seal($this); // Non-extensible, Non-removable

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
		_volumeSlider = new Control.Slider(_$.volume_box_slider.down('.handle'), _$.volume_box_slider,
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

			$("tab-upload").on("click", _tabsManager.ShowUploadTab);
			$("tab-query").on("click", _tabsManager.ShowCustomQueriesTab);
			$("tab-notifs").on("click", _tabsManager.ShowNotificationTab);
			$("tab-debug").on("click", _tabsManager.ShowDebugTab);
		})();
	}
	_initialize();
}

//---
// [Public] Functions
// (No access to private data and methods)
// (Access to public members/methods and privileged methods)

/*
var jukeboxui_public_methods =
{

};

// Add them nicely to the prototype
Extend(JukeboxUI.prototype, jukeboxui_public_methods);
*/

// [Static] Variables
JukeboxUI.defaults =
{
	ActivityMonitorColor:
	{
		active: "orange",
		inactive: "green"
	},
	css:
	{

	}
};

JukeboxUI.skins = ["default"/*, "light", "dark"*/];

Object.freeze(JukeboxUI); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(JukeboxUI.prototype); // 1337 strict mode
