var uniqid = 0,
	sendQueryProxy;

/**
* Represents a Jukebox controller.
* @constructor
* @param {string} element - The DOM element that contains the jukebox.
* @param {object} [opts] - The facultative options.
* @return {Jukebox} The Jukebox object.
*/
function Jukebox(element, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		// See: http://stackoverflow.com/questions/383402/is-javascript-s-new-keyword-considered-harmful
		return new Jukebox(element, opts);
	}

	//---
	// [Public] Variables

	this.id = "Jukebox" + (++uniqid);
	this.stream = "";
	this.channel = "";
	this.song = null; // Mapped to _current_song
	this.listenersCount = 0; // Mapped to _last_nb_listening_users
	this.streaming = false;
	this.playing = false;
	this.lastServerResponse = null;

	//---
	// [Private] Variables

	// `this` refers to current object, because we're in a "new" object creation
	// Can be used in private methods, privileged methods and events handlers
	var $this = this,

		_opts = Extend(true, {}, Jukebox.defaults, opts), // Recursively merge options

		_timestamp = 0, // last timestamp sent by server
		_channel = null, // current channel we're connected to
		_playQueueSongs = [], // songs in current playlist
		_current_song = null,

		// http://www.schillmania.com/projects/soundmanager2/
		_streamPlayer = null, // mp3 stream player (Flash/ActionScript)
		_volume = 100,

		// Utility
		_last_nb_listening_users = 0,
		_nextQuery = new Query(0),
		_query_in_progress = false,
		_query_timer = null,
		_waitingQueries = [],
		_uploadedFiles = {},
		_readyCallback = null,

		_ui = null; // Graphic interface
	
	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)

	/**
	* @param {function} callback - Execute callback when the jukebox is ready. Might be immediately. Only last registered callback works.
	* @return {Jukebox} this.
	*/
	this.ready = function(callback)
	{
		if(typeof callback !== "function")
		{
			var msg = "Invalid parameter: .ready() needs a function";
			Notifications.Display(Notifications.LEVELS.error, msg);
			throw new Error(msg);
		}

		_readyCallback = callback;

		if(soundManager.enabled)
		{
			_startCallback();
		}

		return this;
	};

	/**
	* @param {bool} auto - Activate of deactivate autorefresh mode. This will update current song.
	* @return {Jukebox} this.
	*/
	this.autoRefresh = function(auto)
	{
		_opts.autorefresh = !!auto; // Cast to bool
		if(_opts.autorefresh) // Start autorefresh
		{
			_update();
		}
		return this;
	};

	/**
	* Force an update right now.
	* @return {Jukebox} this.
	*/
	this.refresh = function()
	{
		_timestamp = 0;
		_update();
		return this;
	};
	
	/**
	* @param {string} channel - The channel to join.
	* @return {Jukebox} this.
	*/
	this.joinChannel = function(channel)
	{
		_doAction(new Action("join_channel", {channel: channel}));
		return this;
	};

	/**
	* (Re-)Start the audio stream
	* @return {Jukebox} this.
	*/
	this.start = function()
	{
		_streamPlayer.play();
		this.streaming = true;
		_ui.playing(this.playing = true);
		return this;
	};

	/**
	* Stop the audio player. Does NOT stop the streaming.
	* @return {Jukebox} this.
	*/
	this.stop = function()
	{
		_streamPlayer.unload();
		this.streaming = false;
		_ui.playing(this.playing = false);
		return this;
	};

	/**
	* @param {int|string} [volume] - The volume to set in the [0-100] range.
	* @return {int} The volume in the [0-100] range.
	*/
	this.volume = function(volume)
	{
		if(arguments.length > 0) // Important: this condition allows volume==0 ; "if(!volume)" doesn't.
		{
			volume = Number(volume);
			if(volume < 0 || volume > 100)
			{
				var msg = "Invalid volume level: " + volume + " is not in 0-100 range";
				Notifications.Display(Notifications.LEVELS.error, msg);
				throw new Error(msg);
			}
			else
			{
				_streamPlayer.setVolume(volume); // 0-100
				_ui.volume(volume);
			}
		}
		_volume = _streamPlayer.volume;
		return _volume;
	};

	/**
	* Make a search
	* @param {int} page 
	* @param {int} identifier 
	* @param {string} select_fields 
	* @param {string} search_value 
	* @param {string} search_comparison 
	* @param {string} search_field 
	* @param {string} order_by 
	* @param {int} result_count 
	* @param {bool} select 
	* @return {Jukebox} this.
	*/
	this.search = function(/*page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select*/)
	{
		var action = Action.search.apply(0, arguments); // trick to avoid copy/paste of args
		_doAction(action);
		return this;
	};

	/*TODO:

	this.PlayQueue =
	{
		addToRandom: function(mid | search, comparison, field, order, first, count)
		{
			
		},
		addToTop: function(mid | search, comparison, field, order, first, count)
		{
			
		},
		addToBottom: function(mid | search, comparison, field, order, first, count)
		{

		},
		delete: function(mid, play_queue_index)
		{

		},
		shuffle: function()
		{

		},
		move: function(mid, play_queue_index, new_play_queue_index)
		{

		},
		size: function()
		{

		}
	};

	function PlayQueue()
	{
		
	}
	PlayQueue.prototype.addToRandom = function(mid)
	{
	
	};

	*/

	/**
	* Add a song to the play queue at a certain position
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index to put the song to
	* @return {Jukebox} this.
	*/
	this.addToPlayQueue = function(mid, play_queue_index)
	{
		_addToPlayQueue(mid, play_queue_index);
		return this;
	};

	/**
	* Add a song at a random position in the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueRandom = function(mid)
	{
		_addToPlayQueue(mid, Math.floor(Math.random() * _playQueueSongs.length));
		return this;
	};

	/**
	* Add a song at the top of the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueTop = function(mid)
	{
		_addToPlayQueue(mid, 0);
		return this;
	};

	/**
	* Add a song at the end of the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueBottom = function(mid)
	{
		_addToPlayQueue(mid, _playQueueSongs.length);
		return this;
	};

	/**
	* Shuffle the play queue
	* @return {Jukebox} this.
	*/
	this.playQueueShuffle = function()
	{
		_doAction(new Action("shuffle_play_queue"));
		return this;
	};

	/**
	* Delete a song or all songs from the play queue
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index of the song ; This parameter is used to check for a simultaneous deletion (by another user)
	* @return {Jukebox} this.
	*/
	this.playQueueDelete = function(mid, play_queue_index)
	{
		if(arguments.length === 0)
		{
			_playQueueDelete();
		}
		else
		{
			_playQueueDelete(mid, play_queue_index);
		}
		return this;
	};

	/**
	* Move a song position in the play queue.
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Current song position ; Used to check for a simultaneous deletion (see playQueueDelete)
	* @param {int} new_play_queue_index - New song position
	* @return {Jukebox} this.
	*/
	this.playQueueMove = function(mid, play_queue_index, new_play_queue_index)
	{
		_doAction(new Action("move_in_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index,
				new_play_queue_index: new_play_queue_index
			})
		);
		return this;
	};

	/**
	* Get current play queue length
	* @return {int} Play queue length.
	*/
	this.playQueueSize = function()
	{
		return _playQueueSongs.length;
	};

	/**
	* Add a whole search randomly to the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueRandom = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('rand', search, comparison, field, order, first, count);
		return this;
	};

	/**
	* Add a whole search to the top of the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueTop = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('head', search, comparison, field, order, first, count);
		return this;
	};

	/**
	* Add a whole search to the end of the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueBottom = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('tail', search, comparison, field, order, first, count);
		return this;
	};

	/**
	* Save current play queue. Overwrite previous record with same identifier.
	* @param {string} name - Identifier
	* @return {Jukebox} this.
	*/
	this.savePlayQueue = function(name)
	{
		if(_supportsHTML5Storage())
		{
			var playqueues = _getHTML5Storage("playqueues") || {};

			// Only store id
			var ids = [];
			for(var i = 0, len = _playQueueSongs.length; i < len; ++i)
			{
				ids[i] = _playQueueSongs[i].mid;
			}

			playqueues[name] = ids; // Add current play queue

			localStorage["playqueues"] = JSON.stringify(playqueues); // Save
		}
		else
		{
			Notifications.Display(Notifications.LEVELS.warning, "Cannot save playqueue: HTML5 storage not supported!");
		}
		return this;
	};

	/**
	* Restore a specific play queue by adding at the bottom
	* @param {string} name - Identifier
	* @param {string} [position] - rand | head | tail ; default = tail
	* @return {Jukebox} this.
	*/
	this.restorePlayQueue = function(name, position)
	{
		if(_supportsHTML5Storage())
		{
			var playqueues = _getHTML5Storage("playqueues"),
				error = false;

			if(playqueues !== null)
			{
				var ids = playqueues[name],
					start = position == 'head' ? 0 : position == 'rand' ? Math.floor(Math.random() * _playQueueSongs.length) : _playQueueSongs.length;
				if(ids)
				{
					_addToPlayQueue(ids, $R(start, start + ids.length).toArray());
				}
				else
				{
					error = true;
				}
			}
			else
			{
				error = true;
			}

			if(error)
			{
				Notifications.Display(Notifications.LEVELS.warning, "Unknown play queue in storage!");
			}
		}
		return this;
	};

	/**
	* Free up HTML5 storage
	* @param {string} name - Identifier
	* @return {Jukebox} this.
	*/
	this.deletePlayQueue = function(name)
	{
		if(_supportsHTML5Storage())
		{
			var playqueues = _getHTML5Storage("playqueues");
			if(playqueues)
			{
				delete playqueues[name];
				localStorage["playqueues"] = JSON.stringify(playqueues); // Save
			}
		}
		return this;
	};

	/**
	* Go to the next song
	* @return {Jukebox} this.
	*/
	this.next = function(/*TODO: index*/)
	{
		_doAction(new Action("next"));
		return this;
	};

	/**
	* Go to the previous song
	* @return {Jukebox} this.
	*/
	this.previous = function(/*TODO: index*/)
	{
		_doAction(new Action("previous"));
		return this;
	};

	/**
	* Load a server plugin
	* @param {string} name - The plugin name
	* @return {Jukebox} this.
	*/
	this.plugin = function(name)
	{
		_doAction(new Action('select_plugin',
			{
				channel: _channel.name,
				plugin_name: name
			})
		);
		return this;
	};

	/**
	* Ask the server for the list of uploaded files
	* @return {Jukebox} this.
	*/
	this.getUploadedFiles = function()
	{
		_doAction(new Action("get_uploaded_files"));
		return this;
	};

	/**
	* Get the uploaded files list from last fetch. You have to call getUploadedFiles() first.
	* @return {Array<File>} Uploaded files.
	*/
	this.uploadedFiles = function()
	{
		return _uploadedFiles.files ? _uploadedFiles.files.slice() : []; // Cloned: can be setted without impact
	};

	/**
	* Delete an uploaded file
	* @param {string} filename - The upload file to delete
	* @return {Jukebox} this.
	*/
	this.deleteUploadedFile = function(filename)
	{
		_doAction(new Action("delete_uploaded_file", {file_name: filename}));
		return this;
	};

	/**
	* Validate an uploaded file
	* @param {string} filename - The upload file to validate
	* @return {Jukebox} this.
	*/
	this.validateUploadedFile = function(filename)
	{
		_doAction(new Action("validate_uploaded_file", {file_name: filename}));
		return this;
	};

	/**
	* Update an uploaded file
	* @param {object} opts - The update instructions
	* @return {Jukebox} this.
	*/
	this.updateUploadedFile = function(opts)
	{
		_doAction(new Action("update_uploaded_file", opts));
		return this;
	};

	//-----
	// [Private] Functions

	/**
	* A little helper to add an action to the next query and do the query immediately
	* @param {Action} action - The action to add
	*/
	function _doAction(action)
	{
		_nextQuery.addAction(action);
		_update();
	}

	/**
	* Prepare an AJAX query
	*/
	function _update()
	{
		_ui.activity(true);
		
		if(_query_in_progress === false)
		{
			// Timeout has ended or new query arrived and timeout still in progress
			if(_query_timer != null)
			{
				clearTimeout(_query_timer);
				_query_timer = null;
			}
		}
		else
		{
			// Query is being sent and new query has arrived
			_waitingQueries.push(_nextQuery);
			_nextQuery = new Query(); // Create a new nextQuery, that will not contain actions for previous _update()
			return;
		}

		_query_in_progress = true;

		var query = _nextQuery;
		_nextQuery = new Query();
		_sendQuery(query);
	}

	/**
	* Send an AJAX query
	* @param {Query} query - The query to send
	*/
	function _sendQuery(query)
	{
		query.setTimestamp(_timestamp);

		_ui.sendingQuery(query.valueOf());

		var query_json = query.toJSON();
		new Ajax.Request(_opts.URL,
		{
			method: 'POST',
			postBody: query_json,

			// Note: Be carreful if you do simultaneous queries
			// This only work with 1 query at a time
			onSuccess: _events.querySuccess,
			onFailure: _events.queryFailure,
			onComplete: _events.queryComplete
		});
	}

	// Expose _sendQuery in current scope for customQueries.js
	sendQueryProxy = function(query)
	{
		_nextQuery = query; // current value of _nextQuery is lost
		_update();
	};

	/**
	* Parse a server response. In a way, does the opposite of new Action().
	* @param {object} json - The JSON response
	*/
	function _parseJSONResponse(json)
	{
		if(json.timestamp)
		{
			_timestamp = json.timestamp;
		}
		if(json.current_song)
		{
			_current_song = json.current_song;

			// Expose public infos
			$this.song = Extend(true, {}, _current_song); // Cloned: can be setted without impact

			$this.lastServerResponse = new Date();

			_ui.updateCurrentSong(_current_song);
			_ui.updateSongTime(_current_song, $this.lastServerResponse.getTime() / 1000);
		}
		/*TODO
		if(json.action_response)
		{
			
		}*/
		if(json.channel_infos)
		{
			_channel = json.channel_infos;
			$this.channel = _channel.name;

			var message = "",
				nb;			
			// Notification When new user connection or a user left
			if(_last_nb_listening_users > json.channel_infos.listener_count)
			{
				nb = _last_nb_listening_users - json.channel_infos.listener_count;
				message = nb + " user" + (nb > 1 ? "s" : "") + " left the channel";
				Notifications.Display(Notifications.LEVELS.debug, message);
			}
			else if(_last_nb_listening_users < json.channel_infos.listener_count)
			{
				nb = json.channel_infos.listener_count - _last_nb_listening_users;
				message = nb + " user" + (nb > 1 ? "s" : "") + " join the channel";
				Notifications.Display(Notifications.LEVELS.debug, message);
			}
			$this.listenersCount = _last_nb_listening_users = json.channel_infos.listener_count;
			_ui.updateNbUsers(_last_nb_listening_users);
		}
		if(json.play_queue)
		{
			_ui.cleanupPlayQueue();
			_playQueueSongs = json.play_queue.songs;

			var clone = Extend(true, [], _playQueueSongs); // Clone: can be setted (inside ui) without impact
			_ui.displayPlayQueue(clone, _last_nb_listening_users);
		}
		/*TODO
		if(json.news)
		{
			
		}*/
		if(json.search_results)
		{
			_ui.displaySearchResults(json.search_results);
		}
		if(json.messages)
		{
			json.messages.each(function(message)
			{
				Notifications.Display(message.level, message.message);
			});
		}
		if(json.uploaded_files)
		{
			_uploadedFiles = json.uploaded_files;
			_ui.displayUploadedFiles(_uploadedFiles);
		}
	}

	/**
	* Add a song to the play queue at a certain position
	* @param {int|Array<int>} mid - The song id, or an array of song id
	* @param {int} play_queue_index - Index to put the song to
	*/
	function _addToPlayQueue(mid, play_queue_index)
	{
		var action;
		if(Object.isArray(mid) && Object.isArray(play_queue_index))
		{
			//_nextQuery.removeAllActions();
			for(var i = 0, end = Math.min(mid.length, play_queue_index.length); i < end; i++)
			{
				action = new Action("add_to_play_queue",
				{
					mid: mid[i],
					play_queue_index: play_queue_index[i]
				});
				_nextQuery.addAction(action);
			}
		}
		else
		{
			action = new Action("add_to_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index
			});
			_nextQuery.addAction(action);
		}
		_update();
	}

	/**
	* Delete a song from the play queue
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index of the song
	*/
	function _playQueueDelete(mid, play_queue_index)
	{
		var action;
		if(arguments.length === 0)
		{		
			// Nothing is passed as argument we want to clear all the playlist
			for(var i = _playQueueSongs.length - 1; i >= 0; --i)
			{
				action = new Action("remove_from_play_queue",
				{
					mid: i, // TODO: Caution this is not the currentSong mid must send the right id
					play_queue_index: i
				});
				_nextQuery.addAction(action);
			}
		}
		else if(Object.isArray(mid) && Object.isArray(play_queue_index))
		{
			// We delete all song passed as argument
			for(var j = 0, end = Math.min(mid.length, play_queue_index.length); j < end; ++j)
			{
				action = new Action("remove_from_play_queue",
				{
					mid: mid[j],
					play_queue_index: play_queue_index[j]
				});
				_nextQuery.addAction(action);
			}        
		}
		else
		{
			action = new Action("remove_from_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index
			});
			_nextQuery.addAction(action);
		}
		_update();
	}

	/**
	* Add a whole search at a certain position of the play queue
	* @param {string} position - rand | head | tail 
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	*/
	function _addSearchToPlayQueue(position, search, comparison, field, order, first, count) // TODO make args facultatives
	{
		// TODO add playqueue identifier to parameters
		var opts =
		{
			play_queue_position: position,
			select_fields: "mid",
			search_value: search,
			search_comparison: comparison,
			search_field: field,
			order_by: order,
			first_result: 0,
			result_count: null
		};

		if(comparison == "like")
		{
			opts.first_result = first;
			opts.result_count = count;
		}

		_doAction(new Action("add_search_to_play_queue", opts));
	}

	/**
	* Execute ready callback
	*/
	function _startCallback()
	{
		if(typeof _readyCallback == "function")
		{
			_readyCallback.call($this);
		}
	}

	/**
	* Detect if HTML5 storage is supported
	* @return {bool} true if HTML5 storage is supported, false otherwise
	*/
	function _supportsHTML5Storage()
	{
		try
		{
			return 'localStorage' in window && window['localStorage'] !== null;
		}
		catch(e)
		{
			return false;
		}
	}

	/**
	* Fetch data from HTML5 storage + parse it into an object
	* @param {string} key - Storage identifier
	* @return {object} Saved object, or null
	*/
	function _getHTML5Storage(key)
	{
		var obj = localStorage[key];
		if(obj)
		{
			try
			{
				obj = JSON.parse(obj);
			}
			catch(e)
			{
				obj = null;
			}
		}
		else
		{
			obj = null;
		}
		return obj;
	}

	//--
	// Events handlers

	var _events =
	{
		// AJAX response
		querySuccess: function(response)
		{
			if(_opts.autorefresh)
			{
				_query_timer = setTimeout(function()
				{
					// Call is wrapped in a dummy function to avoid parameter issue with setTimeout
					// See: https://developer.mozilla.org/en/DOM/window.setTimeout
					_update();
				}, _opts.autorefresh_delay);
			}

			if(response.readyState == 4 && response.status === 0) // No ajax response (server down) 
			{
				_ui.gotResponse(null);
				return;
			}

			_ui.gotResponse(response.responseText);

			try
			{
				var json = response.responseText.evalJSON();
				_parseJSONResponse(json);
			}
			catch(parseResponseEx)
			{
				Notifications.Display(Notifications.LEVELS.error, "Error while parsing server response: " + parseResponseEx.message);
			}

			if(_waitingQueries.length > 0)
			{
				// Only do latest request?
				_waitingQueries = []; // Actions of queries referenced in the array are lost
				_update(); // Will use latest _nextQuery
			}
		},
		queryFailure: function()
		{
			//TODO: display error details
			_ui.gotResponse(null);
		},
		queryComplete: function()
		{
			_query_in_progress = false;
			_ui.activity(false);
		}
	};
	
	/**
	* @constructs
	*/
	(function()
	{
		Object.seal($this); // Non-extensible, Non-removable

		soundManager.setup(
		{
			url: _opts.SM2Folder,
			flashVersion: 9, // 8 doesn't work with flash 11.4 & FF16/IE9
			useFlashBlock: true, // Allow recovery from flash blockers,
			debugMode: false,
			useHTML5Audio: true,
			preferFlash: false,
			onready: function()
			{
				var bufferchangeCount = 0,
					lastbufferChange = new Date();

				(function createNewSound(autoplay)
				{
					_streamPlayer = soundManager.createSound(
					{
						id: $this.id,
						url: _opts.streamURL + '?t=' + new Date().getTime(), // Has to be unique, else SM2 re-use previous stream...
						autoPlay: autoplay,
						onbufferchange: function()
						{
							// Check for too many calls to onbufferchange.
							// If we have more than 2 calls in 2 seconds, then something's wrong.
							// (happens on song change for browsers using the flash player)
							// => reload the stream
							// This is also interesting because it allows to free memory at the end of each song.
							
							bufferchangeCount++;
							if(bufferchangeCount > 2)
							{
								setTimeout(function() // Wait that onbufferchange is finished
								{
									bufferchangeCount = 0; // Reset counter

									var currentVolume = _streamPlayer.volume;

									// Reload the steam
									// [Note that .unload().play() isn't enough]									
									_streamPlayer.destruct(); // Good for memory
									createNewSound(true);

									_streamPlayer.setVolume(currentVolume); // Restore volume
								}, 0); // Immediately after current stack
							}

							var now = new Date();
							if(now.getTime() - lastbufferChange.getTime() > 2000)
							{
								bufferchangeCount = 0;
								lastbufferChange = now;
							}
						}
					});
				})(false);
				
				Notifications.Display(Notifications.LEVELS.debug, "Using " + (_streamPlayer.isHTML5 ? "HTML5" : "flash") + " audio player");

				_startCallback();
			},
			ontimeout: function()
			{
				var msg = "SM2 could not start";
				Notifications.Display(Notifications.LEVELS.error, msg);
				throw new Error(msg);
			}
		});

		_ui = new JukeboxUI($this, element,
		{
			replaceTitle: _opts.replaceTitle
		});

		if(_opts.autorefresh)
		{
			_update();
		}
	})();
}

//---
// [Public] Functions
// (No access to private data and methods)
// (Access to public members/methods and privileged methods)

var jukebox_public_methods =
{
	status: function()
	{
		var status = this.id + ' is ' + (this.streaming ? '':'NOT ') + 'connected to url ' + this.stream + ' and currently ' + (this.playing ? '':'NOT ') + 'playing. Current channel is: ' + this.channel + '. ' + this.listenersCount + ' user' + (this.listenersCount > 1 ? 's are':' is') + ' currently listening. Current song is: ' + this.song.title + ' - ' + this.song.artist + '.';
		return status;
	},
	// Time remaining before next song in seconds
	remaining: function()
	{
		var result = 0;
		if(this.song && this.lastServerResponse instanceof Date)
		{
			var timeAfterLastQuery = (new Date().getTime() - this.lastServerResponse.getTime()) / 1000;
			return Math.round(this.song.duration - this.song.elapsed - timeAfterLastQuery);
		}
		return result;
	}
};

// Add them nicely to the prototype
Extend(Jukebox.prototype, jukebox_public_methods);

/**
* [Static] Variables
* @property {string} URL - URL of the web service to fetch JSON infos
* @property {string} streamURL - URL of the stream
* @property {string} SM2Folder - .swf folder for SM2
* @property {bool} autorefresh - Activate autorefresh or not
* @property {int} autorefresh_delay - Delay to get updates from server
* @property {bool} replaceTitle - Change the page title to display current song
*/
Jukebox.defaults =
{
	URL: '/api/json',
	streamURL: '/stream',
	SM2Folder: '/',
	autorefresh: true,
	autorefresh_delay: 3000,
	replaceTitle: true
};

Object.freeze(Jukebox); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(Jukebox.prototype); // 1337 strict mode

this.Jukebox = Jukebox; // Expose on global scope
