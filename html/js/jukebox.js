this.Jukebox = (function(){

/**
* Represents a Query that is going to be sent to server.
* @constructor
* @param {string} lastTimestamp - The last timestamp the client received from server.
* @param {Array<Action>} [actions] - A facultative array of Action.
* @return {Query} The Query object.
*/
function Query(lastTimestamp, actions)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new Query(lastTimestamp, actions);
	}

	this.lastTimestamp = lastTimestamp;
	this.actions = [];
	this.search = null;

	if(actions)
	{
		for(var i = 0; i < actions.length; ++i)
		{
			if(actions[i] instanceof Action)
			{
				this.actions.push(actions[i]);
			}
		}
	}

	// http://www.piotrwalat.net/preventing-javascript-object-modification/
	Object.seal(this); // Non-extensible, Non-removable
}
/**
* Add an action to the query.
* We do not check if the very same action is already in the list.
* The action is not cloned. Therefore you can modify it even after a call to this method.
* @param {Action} action - The action to add.
*/
Query.prototype.addAction = function(action)
{
	if(action instanceof Action)
	{
		if(action.name == "search")
		{
			this.search = action;
		}
		else
		{
			this.actions.push(action);
		}
	}
	else
	{
		throw new Error("Invalid action parameter");
	}
};
/**
* @param {int} timestamp - The last timestamp the client received from server
*/
Query.prototype.setTimestamp = function(timestamp)
{
	this.lastTimestamp = timestamp;
};
/**
* Remove all registered actions.
*/
Query.prototype.removeAllActions = function()
{
	this.actions = [];
};
/**
* Output a JSON string representing the query (stringify).
* @return {string} The stringified JSON query.
*/
Query.prototype.toJSON = function()
{
	return Object.toJSON(this.valueOf());
};
/**
* Output an object representing the query.
* @return {object} The query object.
*/
Query.prototype.valueOf = function()
{
	var obj;

	if(this.actions.length == 0)
	{
		obj = {timestamp: this.lastTimestamp}; // Nothing asked
	}
	else
	{
		obj =
		{
			timestamp: this.lastTimestamp,
			action: (this.actions.length == 1 ? this.actions[0] : this.actions)
		};
	}
	if(this.search)
	{
		obj.search = this.search;
	}

	return obj;
};

//==================================================

/**
* Represents an Action that is going to be sent to server.
* @constructor
* @param {string} name - The name of the action.
* @param {object} [opts] - The facultative options.
* @return {Action} The Action object.
*/
function Action(name, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new Action(name, opts);
	}

	this.name = name;
	switch(name)
	{
		case "join_channel":
			this.channel = opts.channel;
			break;
		case "next":
		case "previous":
		case "shuffle_play_queue":
		case "get_uploaded_files":
			// Nothing particular, but declared as valid actions
			break;
		case "add_to_play_queue":
		case "remove_from_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			break;
		case "move_in_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			this.new_play_queue_index = opts.new_play_queue_index;
			break;
		case "get_news":
			this.first_result = opts.first_result;
			this.result_count = opts.result_count;
			break;
		case "select_plugin":
			// TODO : get rid of channel. Server should know in which channel client is.
			this.channel = opts.channel;
			this.plugin_name = opts.plugin_name;
			break;
		case "search":
		case "update_uploaded_file":
		case "add_search_to_play_queue":
			Extend(this, opts);
			break;
		case "delete_uploaded_file":
		case "validate_uploaded_file":
			this.file_name = opts.file_name;
			break;
		default:
			throw new Error("Invalid action");
	}

	Object.seal(this);
}

/**
* Helper to compute a search Action
* @param {int} page 
* @param {int} identifier 
* @param {string} select_fields 
* @param {string} search_value 
* @param {string} search_comparison 
* @param {string} search_field 
* @param {string} order_by 
* @param {int} result_count 
* @param {bool} select 
* @return {Action} The search action.
*/
Action.search = function(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select)
{
	var opts =
	{
		identifier: identifier ? identifier : null,
		select: !!select,

		search_value: search_value,
		search_comparison: search_comparison ? search_comparison : search_field != 'genre' ? 'like' : 'equal',
		search_field: search_field,

		first_result: (!page || page == 1) ? 0 : page,
		result_count: result_count
	};
	if(order_by)
	{
		opts.order_by = order_by;
	}
	if(select_fields)
	{
		opts.select_fields = select_fields;
	}

	var searchOpts = Extend({}, Action.search.defaultOptions, opts);
	return new Action('search', searchOpts);
}

Action.search.defaultOptions =
{
	search_value: '',
	search_comparison: 'like', // strict, like, equal
	search_field: '', // ex.: title, artist, album
	order_by: 'artist,album,track,title', // ex.: title COLLATE NOCASE DESC, artist ASC, album
	select_fields: 'mid,title,album,artist,track,genre,duration',
	first_result: 0,
	result_count: 20
};

//==================================================

/**
* Merge the contents of two or more objects together into the first object
* Inspired from jQuery.extend
* Keep in mind that the target object (first argument) will be modified, and will also be returned.
* If, however, we want to preserve both of the original objects, we can do so by passing an empty object as the target.
* 
* @param {bool} [deep] - If true, the merge becomes recursive (aka. deep copy).
* @param {object} target - An object that will receive the new properties.
* @param {object} obj1 - An object containing additional properties to merge in.
* @param {object} [objN] - Additional objects containing properties to merge in.
* @return {object} The target with merged properties.
*/
function Extend(/*deep, */target/*, obj1, obj2, obj3, objN*/)
{
	var deep = false,
		i = 1;

	// Handle a deep copy situation
	if(typeof target === "boolean")
	{
		deep = target;
		target = arguments[1] || {};
		// Skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
    if(typeof target !== "object" && typeof target !== "function")
    {
        target = {};
    }

	for(var len = arguments.length; i < len; ++i)
	{
		var options = arguments[i];
		if(options != null) // Only deal with non-null/undefined values
		{
			for(var name in options)
			{
				var src = target[name],
					copy = options[name];

				// Prevent never-ending loop
				if(target === copy)
				{
					continue;
				}

				// Recurse if we're merging object literal values or arrays
				if(deep && copy && (Object.isArray(copy) || typeof copy == "object")) // typeof operator is a bad shortcut here and on next line
				{
					var clone = src && (Object.isArray(src) || typeof src == "object" ) ? src : Object.isArray(copy) ? [] : {};

					// Never move original objects, clone them
					target[name] = Extend(deep, clone, copy);
				}
				else if(copy !== undefined) // Don't bring in undefined values
				{
					// Added custom check to avoid prototypejs functions added on Array.prototype for instance
					if(options.hasOwnProperty(name))
					{
						target[name] = copy;
					}
				}
			}
		}
	}
	return target; // Return the modified object
}

//==================================================

var uniqid = 0;

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

	this.name = "Jukebox" + (++uniqid);
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

		// http://jssoundkit.sourceforge.net/
		// http://help.adobe.com/en_US/AS2LCR/Flash_10.0/help.html?content=00001523.html
		// http://forums.mediabox.fr/wiki2/documentation/flash/as2/sound
		_streamPlayer = new Sound(), // the mp3 stream player (Flash/ActionScript)
		_streamURL = "/stream",

		// Utility
		_last_nb_listening_users = 0,
		_nextQuery = new Query(0),
		_query_in_progress = false,
		_query_timer = null,
		_waitingQueries = [],
		_uploadedFiles = {},

		_ui = null; // Graphic interface
	
	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)

	/**
	* @param {function} callback - Execute callback when the jukebox is ready (.swf fully loaded). Might be immediately. Only last registered callback works.
	* @return {Jukebox} this.
	*/
	this.ready = function(callback)
	{
		if(typeof callback !== "function")
		{
			var msg = "Invalid parameter: .ready() needs a function";
			Notifications.Display(Notifications.LEVEL.error, msg);
			throw new Error(msg);
		}

		function load()
		{
			// We have to wait that SoundBridge.swf is loaded... else ".proxyMethods" does not exists yet on flash object
			// TODO: use a better .swf lib that trigger an event/a callback when the .swf is ready
			if(typeof Sound.__thisMovie(_streamPlayer.object_id).proxyMethods == "function") // consider .swf ready
			{
				callback.call($this);
			}
			else
			{
				setTimeout(load, 100); // Retry in 100ms ; Note that .ready() will return before
			}
		}
		load();

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
	* Start the audio stream for a specific url
	* @param {string} [streamURL] - Facultative stream URL, overriding default.
	* @return {Jukebox} this.
	*/
	this.play = function(streamURL)
	{
		_streamURL = streamURL ? streamURL : _streamURL;
		$this.stream = _streamURL; // copy

		_streamPlayer.loadSound(_streamURL, /*streaming*/true);

		$this.streaming = true;
		_ui.playing($this.playing = true);

		return this;
	};

	/**
	* (Re-)Start the audio stream
	* @return {Jukebox} this.
	*/
	this.start = function()
	{
		_streamPlayer.start();
		_ui.playing($this.playing = true);
		return this;
	};

	/**
	* Stop the audio player. Does NOT stop the streaming.
	* @return {Jukebox} this.
	*/
	this.stop = function()
	{
		_streamPlayer.stop();
		_ui.playing($this.playing = false);
		return this;
	};

	/**
	* Stop the download.
	* @return {Jukebox} this.
	*/
	this.stopStreaming = function()
	{
		this.stop(); // Stop the audio

		// Then stop the download:
		// Not clean. Not working if /null is a valid stream url on server side...
		//TODO: remove flash object?
		_streamPlayer.loadSound(null, false);
		$this.streaming = false;

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
				Notifications.Display(Notifications.LEVEL.error, msg);
				throw new Error(msg);
			}
			else
			{
				_streamPlayer.setVolume(volume); // 0-100
				_ui.volume(volume);
			}
		}
		return _streamPlayer.getVolume();
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
		if(action.search_value)
		{
			_doAction(action);
		}
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
	* Delete a song from the play queue
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index of the song ; This parameter is used to check for a simultaneous deletion (by another user)
	* @return {Jukebox} this.
	*/
	this.playQueueDelete = function(mid, play_queue_index)
	{
		_playQueueDelete(mid, play_queue_index);
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

	/*TODO; html5storage?
	Ability to save playlist and share them could be interesting
	this.savePlayList = function(name)
	{
		
	}

	this.restorePlayList = function(name)
	{
		
	}*/

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
	* @param {Action} action - The action to add.
	*/
	function _doAction(action)
	{
		_nextQuery.addAction(action);
		_update();
	}

	// Prepare an AJAX query
	function _update()
	{
		_ui.activity(true);
		
		if(_query_in_progress == false)
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

	// Send an AJAX query
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
	* @param {int} mid - The song id
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
		if(!mid || !play_queue_index)
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

	//---
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

			if(response.readyState == 4 && response.status == 0) // No ajax response (server down) 
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
	
	//---
	// Constructor
	
	/**
	* @constructor
	*/
	function _initialize()
	{
		Object.seal($this); // Non-extensible, Non-removable

		_ui = new JukeboxUI($this, element,
		{
			replaceTitle: _opts.replaceTitle
		});

		if(_opts.autorefresh)
		{
			_update();
		}
	}
	_initialize();
}

//---
// [Public] Functions
// (No access to private data and methods)
// (Access to public members/methods and privileged methods)

var jukebox_public_methods =
{
	status: function()
	{
		var status = this.name + ' is ' + (this.streaming ? '':'NOT ') + 'connected to url ' + this.stream + ' and currently ' + (this.playing ? '':'NOT ') + 'playing. Current channel is: ' + this.channel + '. ' + this.listenersCount + ' user' + (this.listenersCount > 1 ? 's are':' is') + ' currently listening. Current song is: ' + this.song.title + ' - ' + this.song.artist + '.';
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
/*for(var jmethod in jukebox_public_methods)
{
	Jukebox.prototype[jmethod] = jukebox_public_methods[jmethod];
}*/
Extend(Jukebox.prototype, jukebox_public_methods);

// [Static] Variables
Jukebox.defaults =
{
	URL: '/api/json',
	streamURL: '/stream',
	autorefresh: true,
	autorefresh_delay: 3000,
	replaceTitle: true
};

//==================================================

// UI Tools
//----------

/**
* Format a timestamp to a string in the format: [h:]m:s
* 0 are only added to minutes and seconds if necessary.
* @param {string|number} t - The timestamp.
* @return {string} The formatted timestamp.
*/
function FormatTime(t)
{
	var str = null;
	t = Number(t);
	if(!isNaN(t))
	{
		var h = Math.floor(t / 3600),
			m = Math.floor(t % 3600 / 60),
			s = Math.floor(t % 3600 % 60);
		str = ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
	}
	return str;
}

//==================================================

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
		music_wrapper: $('music_wrapper'), // TODO: replace thoses id by (sub)classes
		expand_button: $('expand_button'),
		collapse_button: $('collapse_button'),
		page_wrapper: $('page_wrapper'),
		search_input: $('search_input'),
		search_field: $('search_field'),
		search_genres: $('search_genres'),
		results_per_page: $('results_per_page'),
		btn_search: $('btn_search'),
		progressbar: $('progressbar'),
		player_song_time: $('player_song_time'),
		activity_monitor: $('activity_monitor'),
		play_stream: $('play_stream'),
		stop_stream: $('stop_stream'),
		channel: $('channel'),
		btn_join_channel: $('btn_join_channel'),
		previous_button: $('previous_button'),
		next_button: $('next_button'),
		cb_autorefresh: $('cb_autorefresh'),
		btn_refresh: $('btn_refresh'),
		player_song_artist: $('player_song_artist'),
		player_song_album: $('player_song_album'),
		player_song_title: $('player_song_title'),
		play_queue_content: $('play_queue_content'),
		selection_plugin: $('music_selection_plugin'),
		btn_apply_plugin: $('btn_apply_plugin'),
		volume_box_slider: $('volume_box_slider')
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
		if(status == true)
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
		// 		=> less refresh calls
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
			function doSearch(search, category)
			{
				_search(1, null, null, search, 'equal', category, 'artist,album,track,title', null, false);
			}

			_$.player_song_artist.update(songObj.artist).stopObserving().on("click", function()
			{
				doSearch(songObj.artist, 'artist');
			});
			_$.player_song_album.update(songObj.album).stopObserving().on("click", function()
			{
				doSearch(songObj.album, 'album');
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
		var items = $$('span.count_user_listening');
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
			Droppables.remove('play_queue_song_' + i);
		}
	};

	this.displayPlayQueue = function(playQueueSongs)
	{
		var ul = new Element('ul');
		var li = '' +
		'<li id="play_queue_li_first" class="droppable">Play queue' +
			'<div>' +
				'<span class="nb_listening_users"></span>' +
				'<span class="count_user_listening">' + J.listenersCount + '</span>' +
			'</div>' +
			'<a><span class="play_queue_shuffle"></span></a>' +
			'<a><span class="play_queue_delete"></span></a>' +
		'</li>';
		ul.insert(li);

		ul.down(".play_queue_shuffle").on("click", function()
		{
			J.playQueueShuffle();
		});
		ul.down(".play_queue_delete").on("click", function()
		{
			J.playQueueDelete();  // no args = all
		});

		var currentPQSongIndex = 0,
			lastPQIndex = playQueueSongs.length - 1;
		playQueueSongs.each(function(song)
		{
			li = '' +
			'<li id="play_queue_li_' + currentPQSongIndex + '" class="droppable">' +
				'<div id="play_queue_song_' + currentPQSongIndex + '" class="play_queue_draggable">' +
					'<div id="play_queue_handle_' + currentPQSongIndex + '" class="play_queue_handle">' +
						'<a href="javascript:void(0)">' + song.artist + '</a>' +
						' - ' +
						'<a href="javascript:void(0)">' + song.album + '</a>' +
						' - ' +
						song.title + ' (' + FormatTime(song.duration) + ')' +
					'</div>' +
					'<a><span class="play_queue_move_top"></span></a>' +
					'<a><span class="play_queue_move_bottom"></span></a>' +
					'<a><span class="play_queue_delete"></span></a>' +
				'</div>' +
			'</li>';
			ul.insert(li);

			// Store mid
			ul.down('li:last > div').store('mid', song.mid);

			// Declare listeners
			ul.down('li:last .play_queue_handle a:first').on("click", function()
			{
				_search(1, null, null, song.artist, 'equal', 'artist', 'artist,album,track,title', 20, false);
			});
			ul.down('li:last .play_queue_handle a:last').on("click", function()
			{
				_search(1, null, null, song.album, 'equal', 'album', 'artist,album,track,title', 20, false);
			});
			var localcurrentPQSongIndex = currentPQSongIndex; // Avoid closure issue
			ul.down('li:last .play_queue_move_top').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, 0);
			});
			ul.down('li:last .play_queue_move_bottom').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, lastPQIndex);
			});
			ul.down('li:last .play_queue_delete').on("click", function()
			{
				J.playQueueDelete(1, localcurrentPQSongIndex);
			});

			currentPQSongIndex++;
		});
		
		_$.play_queue_content.update(ul);
		
		// Create all draggables, once update is done.
		for(var i = 0, len = playQueueSongs.length; i < len; i++)
		{
			new Draggable('play_queue_song_' + i,
			{
				scroll: window,
				constraint: 'vertical',
				revert: true,
				handle: 'play_queue_handle_' + i,
				onStart: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play_queue_li_' + id).addClassName('being_dragged');
				},
				onEnd: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play_queue_li_' + id).removeClassName('being_dragged');
				}
			});
			_makePlayQueueSongDroppable('play_queue_li_' + i, playQueueSongs);
		}
		_makePlayQueueSongDroppable('play_queue_li_first', playQueueSongs);
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

		if(search_value)
		{
			J.search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select);
		}
	}

	function _makePlayQueueSongDroppable(droppable_id, playQueueSongs)
	{
		Droppables.add(droppable_id,
		{ 
			accept: ['play_queue_draggable', 'library_draggable'],
			overlap: 'vertical',
			hoverclass: 'droppable_hover',
			onDrop: function(dragged, dropped/*, event*/)
			{
				var old_index,
					song_mid;
				if(dragged.hasClassName("play_queue_draggable"))
				{
					old_index = parseInt(dragged.id.substring(16), 10);
					song_mid = dragged.retrieve('mid');
					
					var new_index = -1;
					if(dropped.id != "play_queue_li_first")
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
				else if(dragged.hasClassName("library_draggable"))
				{
					var tab_index = dragged.id.replace(/.*_([^_]*_[^_]*)_[0-9]*/, "$1");
					old_index = parseInt(dragged.id.replace(/.*_[^_]*_[^_]*_([0-9]*)/, "$1"), 10);
					var song = _tabs.getTabFromUniqueId(tab_index).server_results[old_index];
					song_mid = song.mid;
					
					var play_queue_index = -1;
					if(dropped.id != "play_queue_li_first")
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
			J.play();
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
				if(_$.search_genres.options.length == 0) // Fill it, before display
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

			$("tab_upload").on("click", _tabsManager.ShowUploadTab);
			$("tab_query").on("click", _tabsManager.ShowCustomQueriesTab);
			$("tab_notifs").on("click", _tabsManager.ShowNotificationTab);
			$("tab_debug").on("click", _tabsManager.ShowDebugTab);
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

Object.freeze(Jukebox); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(Jukebox.prototype); // 1337 strict mode

return Jukebox;
})();
