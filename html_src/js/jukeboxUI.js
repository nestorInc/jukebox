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
			var currentSongElapsedTime = song.elapsed + (new Date().getTime() / 1000) - lastServerResponse;
			nextSongSecondIn = (Math.ceil(currentSongElapsedTime) - currentSongElapsedTime) * 1000;
			
			if(currentSongElapsedTime > song.duration) // Avoid >100%
			{
				currentSongElapsedTime = song.duration;
			}
		 
			if(_lastCurrentSongElapsedTime === null || currentSongElapsedTime > _lastCurrentSongElapsedTime)
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
		var items = _$.jukebox.select('.'+_opts.rootClass+'-listening-count');
		items.each(function(e)
		{
			e.update(count.toString());
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
		_cleanupPlayQueue();

		// Playqueue header template
		var playQueueTpl = new Template(_skin.templates.playQueue),
		playQueueTplVars =
		{
			root: _opts.rootClass,
			playQueueLabel: 'Play queue',
			listenersCount: J.listenersCount
		};
		
		// Create playqueue header
		var ul = new Element(_skin.params.playQueueNode).insert(playQueueTpl.evaluate(playQueueTplVars));

		// Declare listeners
		var rootClass = '.' + _opts.rootClass + '-',
			$shuffle = ul.down(rootClass+"playqueue-shuffle"),
			$delete = ul.down(rootClass+"playqueue-delete");
		if($shuffle)
		{
			$shuffle.on("click", function()
			{
				J.playQueueShuffle();
			});
		}
		if($delete)
		{
			$delete.on("click", function()
			{
				J.playQueueDelete();  // no args = all
			});
		}

		// Each song template
		var currentPQSongIndex = 0,
			lastPQIndex = playQueueSongs.length - 1;
		playQueueSongs.each(function(song)
		{
			// Playqueue song template
			var playQueueSongTpl = new Template(_skin.templates.playQueueSong),
			playQueueSongTplVars =
			{
				root: _opts.rootClass,
				index: currentPQSongIndex,
				artist: song.artist,
				album: song.album,
				title: song.title,
				duration: FormatTime(song.duration)
			};
			ul.insert(playQueueSongTpl.evaluate(playQueueSongTplVars));

			// Declare listeners
			var li = ul.down((_skin.params.songNode) + ':last');

			// Store mid
			li.store('mid', song.mid);

			// Artist
			var $artist = li.down(rootClass+'playqueue-handle a:first');
			if($artist)
			{
				$artist.on("click", function()
				{
					_search(1, null, null, song.artist, 'equal', 'artist', 'artist,album,track,title', 20, false);
				});
			}

			// Album
			var $album = li.down(rootClass+'playqueue-handle a:last');
			if($album)
			{
				$album.on("click", function()
				{
					_search(1, null, null, song.album, 'equal', 'album', 'artist,album,track,title', 20, false);
				});
			}

			var localcurrentPQSongIndex = currentPQSongIndex, // Avoid closure issue
				$top = li.down(rootClass+'playqueue-move-top'),
				$bottom = li.down(rootClass+'playqueue-move-bottom');
			
			if($top)
			{
				$top.on("click", function()
				{
					J.playQueueMove(1, localcurrentPQSongIndex, 0);
				});
			}
			if($bottom)
			{
				$bottom.on("click", function()
				{
					J.playQueueMove(1, localcurrentPQSongIndex, lastPQIndex);
				});
			}
			$delete = li.down(rootClass+'playqueue-delete');
			if($delete)
			{
				$delete.on("click", function()
				{
					J.playQueueDelete(1, localcurrentPQSongIndex);
				});
			}

			currentPQSongIndex++;
		});
		

		if(ul.nodeName == 'TBODY')
		{
			ul = ul.wrap('table');
		}

		_$.play_queue_content.update(ul);

		function dragStart(dragged)
		{
			var id = _findDraggedId(dragged.element);
			if(id !== null)
			{
				ul.down(rootClass+'playqueue-' + id).addClassName(_opts.rootClass+'-being-dragged');
			}
		}

		function dragEnd(dragged)
		{
			var id = _findDraggedId(dragged.element);
			if(id !== null)
			{
				ul.down(rootClass+'playqueue-' + id).removeClassName(_opts.rootClass+'-being-dragged');
			}
		}
		
		// Create all draggables, once update is done.
		for(var i = 0, len = playQueueSongs.length; i < len; i++)
		{
			var droppable = ul.down(rootClass+'playqueue-' + i),
				draggable = droppable.down(rootClass+'playqueue-draggable');

			if(draggable)
			{
				var handle = draggable.down(rootClass+'playqueue-handle-' + i);
				new Draggable(draggable,
				{
					scroll: window,
					constraint: 'vertical',
					revert: true,
					handle: handle,
					onStart: dragStart,
					onEnd: dragEnd
				});
				_makePlayQueueSongDroppable(droppable, playQueueSongs);
			}
		}
		var first = ul.down(rootClass+'playqueue-first');
		if(first)
		{
			_makePlayQueueSongDroppable(first, playQueueSongs);
		}
	};

	/**
	* Render results of a search
	* @param {object} results - Results sent by server
	*/
	this.displaySearchResults = function(results)
	{
		// A new search could be initiated from the left pannel so we must automatically expand the right pannel
		_expand();

		var tab = null;
		if(results.identifier)
		{
			// If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed results
			tab = _tabs.getTabFromUniqueId(results.identifier);
		}

		if(tab)
		{
			tab.updateNewSearchInformations(results);
			tab.updateContent();
		}
		else
		{
			// Adds the new created tab to the tabs container
			var searchTab = new SearchTab(results, _$.tabs, _opts.rootClass, J, _skin.templates.tabs ? _skin.templates.tabs["Search"] : null);
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
		/*TODO: use syntax like that?
		if(TabManager.DebugTag.isDisplayed())
		{
			TabManager.DebugTag.updateResponse(null);
		}
		*/

		var tab = _tabs.getFirstTabByClass(DebugTab);
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

	//-----
	// [Private] Functions
	
	/**
	* Show full player
	*/
	function _expand()
	{
		_$.expand_button.hide();
		_$.collapse_button.show();
		_$.jukebox.addClassName(_opts.rootClass+'-fullplayer');

		if(HTML5Storage.isSupported)
		{
			HTML5Storage.set("fullplayer", true);
		}
	}

	/**
	* Show mini player
	*/
	function _collapse()
	{
		_$.expand_button.show();
		_$.collapse_button.hide();
		_$.jukebox.removeClassName(_opts.rootClass+'-fullplayer');

		if(HTML5Storage.isSupported)
		{
			HTML5Storage.set("fullplayer", false);
		}
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
	* Remove droppability for playqueue items
	*/
	function _cleanupPlayQueue()
	{
		_$.play_queue_content.select('.'+_opts.rootClass+'-playqueue-droppable').each(function(e)
		{
			Droppables.remove(e);
		});
	}

	/**
	* Helper to get the id of a playqueue item
	* @param {DOM} element Item to get id from
	* @param {bool} [drop] Is the element a droppable?
	* @return {string} id extracted from css jukebox-song-<id>, null if not found
	*/
	function _findDraggedId(element, drop)
	{
		var str = drop ? _opts.rootClass+'-playqueue-' : _opts.rootClass+'-playqueue-song-',
			id = null,
			match = element.classNames().detect(function(n){return n.indexOf(str) != -1;});
		if(match)
		{
			id = match.substring(str.length);
		}
		return id;
	}

	/**
	* Make play queue songs droppables
	* @param {int} droppable - The element to make droppable (same as draggable)
	* @param {Array<song>} playQueueSongs - The play queue
	*/
	function _makePlayQueueSongDroppable(droppable, playQueueSongs)
	{
		Droppables.add(droppable,
		{ 
			accept: [_opts.rootClass+'-playqueue-draggable', _opts.rootClass+'-search-row'],
			overlap: 'vertical',
			hoverclass: _opts.rootClass+'-droppable-hover',
			onDrop: function(dragged, dropped)
			{
				var old_index,
					song_mid;
				if(dragged.hasClassName(_opts.rootClass+'-playqueue-draggable'))
				{
					var draggedId = _findDraggedId(dragged);

					old_index = parseInt(draggedId, 10);
					song_mid = dragged.up().retrieve('mid');
					
					var new_index = -1;
					if(!dropped.hasClassName(_opts.rootClass+'-playqueue-first'))
					{
						var droppedId = _findDraggedId(dropped, true);
						new_index = parseInt(droppedId, 10);
					}
					if(new_index <= old_index)
					{
						new_index++;
					}
					if(new_index != old_index)
					{
						J.playQueueMove(song_mid, old_index, new_index);
						
						_cleanupPlayQueue();
						var tmp = playQueueSongs[old_index];
						playQueueSongs.splice(old_index, 1);
						playQueueSongs.splice(new_index, 0, tmp);						
						$this.displayPlayQueue(playQueueSongs);
					}
				}
				else if(dragged.hasClassName(_opts.rootClass+'-search-row'))
				{
					var song = dragged.retrieve('song');
					song_mid = song.mid;
					
					var play_queue_index = -1;
					if(!dropped.hasClassName(_opts.rootClass+'-playqueue-first'))
					{
						var droppedId2 = _findDraggedId(dropped, true);
						play_queue_index = parseInt(droppedId2, 10);
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

	function _init()
	{
		// Create HTML player
		try
		{
			var songTpl = new Template(_skin.templates.song),
			songTplVars =
			{
				root: _opts.rootClass
			},
			jukeboxTpl = new Template(_skin.templates.player),
			jukeboxTplVars =
			{
				root: _opts.rootClass,
				theme: _opts.theme,
				currentSong: songTpl.evaluate(songTplVars),
				canalLabel: 'Canal :',
				canalValue: 'Rejoindre',
				searchLabel: 'Rechercher :',
				searchButton: 'Rechercher',
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
			$elem.insert(jukeboxTpl.evaluate(jukeboxTplVars)); // DOM insertion ; Only location where $elem is modified
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
			expand_button:		$JB.down(rootClass+'expand-button'),
			collapse_button:	$JB.down(rootClass+'collapse-button'),
			search_input:		$JB.down(rootClass+'search-input'),
			search_field:		$JB.down(rootClass+'search-field'),
			search_genres:		$JB.down(rootClass+'search-genres'),
			results_per_page:	$JB.down(rootClass+'results-per-page'),
			btn_search:			$JB.down(rootClass+'search-button'),
			progressbar:		$JB.down(rootClass+'progressbar'),
			player_song_time:	$JB.down(rootClass+'song-time'),
			activity_monitor:	$JB.down(rootClass+'activity'),
			play_stream:		$JB.down(rootClass+'stream-play'),
			stop_stream:		$JB.down(rootClass+'stream-stop'),
			channel:			$JB.down(rootClass+'channel'),
			btn_join_channel:	$JB.down(rootClass+'channel-button'),
			previous_button:	$JB.down(rootClass+'previous-button'),
			next_button:		$JB.down(rootClass+'next-button'),
			cb_autorefresh:		$JB.down(rootClass+'autorefresh'),
			btn_refresh:		$JB.down(rootClass+'refresh-button'),
			player_song_artist: $JB.down(rootClass+'song-artist'),
			player_song_album:	$JB.down(rootClass+'song-album'),
			player_song_title:	$JB.down(rootClass+'song-title'),
			play_queue_content: $JB.down(rootClass+'playqueue-content'),
			selection_plugin:	$JB.down(rootClass+'plugin'),
			btn_apply_plugin:	$JB.down(rootClass+'plugin-button'),
			volume_box_slider:	$JB.down(rootClass+'volume-slider'),
			tabs_links:			$JB.down(rootClass+'tabs-links')
		};

		// Initial visibility state
		_$.collapse_button.hide();
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

		_tabs = new Tabs(_opts.rootClass);
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

		if(_opts.fullplayer)
		{
			_expand();
		}
		
		(function() // Tabs
		{
			var tabsManager = {};
			function createShowTab(tab)
			{
				tabsManager["Show" + tab.classN] = function()
				{
					var search = _tabs.getFirstTabByClass(tab.classC),
						identifier;
					if(search === null)
					{
						var template = _skin.templates.tabs ? _skin.templates.tabs[tab.name] : null;
						var newTab = new tab.classC(tab.name, _$.tabs, _opts.rootClass, J, template);
						identifier = _tabs.addTab(newTab, tab.classN);
					}
					else
					{
						identifier = search.identifier;
					}
					_tabs.toggleTab(identifier);
				};
			}

			var possibleTabs =
			[
				{
					classN: "UploadTab",
					classC: UploadTab,
					name: "Uploader"
				},
				{
					classN: "DebugTab",
					classC: DebugTab,
					name: "Debug"
				},
				{
					classN: "NotificationTab",
					classC: NotificationTab,
					name: "Notifications"
				},
				{
					classN: "CustomQueriesTab",
					classC: CustomQueriesTab,
					name: "Custom queries"
				},
				{
					classN: "PlaylistTab",
					classC: PlaylistTab,
					name: "Playlists"
				}
			];

			for(var i = 0; i < possibleTabs.length; ++i)
			{
				createShowTab(possibleTabs[i]);
			}

			if(_skin.params.allowTabs)
			{
				var TL = _$.tabs_links;
				TL.down(rootClass+'tab-upload').on("click", tabsManager.ShowUploadTab);
				TL.down(rootClass+'tab-query').on("click", tabsManager.ShowCustomQueriesTab);
				TL.down(rootClass+'tab-notifs').on("click", tabsManager.ShowNotificationTab);
				TL.down(rootClass+'tab-debug').on("click", tabsManager.ShowDebugTab);
				TL.down(rootClass+'tab-playlist').on("click", tabsManager.ShowPlaylistTab);

				// Restore opened tabs
				if(HTML5Storage.isSupported)
				{
					setTimeout(function()
					{
						var openedTabs = HTML5Storage.get("tabs") || [];
						for(var i = 0; i < openedTabs.length; ++i)
						{
							var type = openedTabs[i].type;
							if(type == "SearchTab")
							{
								var opts = openedTabs[i].options;
								_search(opts.current_page, opts.identifier, opts.select_fields, opts.search_value, opts.search_comparison, opts.search_field, opts.order_by, opts.result_count/*, select*/);
							}
							else
							{
								tabsManager["Show"+type]();
							}
						}
					}, 0); // Avoid issue when restoring tab on jukebox instanciation (_ui undefined in jukebox.js because _init() not finished yet)
				}
			}
		})();
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
		playQueueNode: 'ul',
		songNode: 'li'
	},
	fullplayer: false
};

JukeboxUI.skins = {}; // See skin/*.js

Object.freeze(JukeboxUI); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(JukeboxUI.prototype); // 1337 strict mode
