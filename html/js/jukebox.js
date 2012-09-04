var channel,
	server_port,
	current_song = null,
	timestamp = 0,
	last_nb_listening_users = 0,
	force_query = false,
	query_timer = null,
	sending_query = false,
	last_time = 0,
	time = 0,

	query = {},
	url = '/api/json',

	playQueueSongs = [],

	refreshSongTimeFromAjaxRequestDatetime = null,
	refreshSongTimeTimer = null,
	refreshFrequency = 100,
	lastCurrentSongElapsedTime = null,

	tabs = new Tabs('tab');

function jsonPrettyPrint(input)
{
	var json_hr = JSON.stringify(input, null, "\t");
	json_hr = json_hr.replace(/\n/g, '<br />');
	json_hr = json_hr.replace(/\t/g, ' &nbsp;&nbsp; ');
	return json_hr;
}

function FormatTime(t)
{
	t = Number(t);
	var h = Math.floor(t / 3600);
	var m = Math.floor(t % 3600 / 60);
	var s = Math.floor(t % 3600 % 60);
	return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
}

function setActivityMonitor(status)
{
	var color = 'green';
	if (status == true)
	{
		color = 'orange';
	}
	$('activity_monitor').setStyle(
	{
		backgroundColor: color
	});
}

function initJukebox()
{
	CollapseCollection();
	setActivityMonitor(false);
	last_time = new Date().getTime() / 1000;
	$('stop_stream').hide();

	$('search_input').observe('keypress', function(event)
	{
		if(event.keyCode == Event.KEY_RETURN)
		{
			doSearch();
			Event.stop(event);
		}
	});
	
	updateJukebox();

	initNotifications();
}

function setSongSelectionPlugin()
{
	var action = {};
	action.name = 'select_plugin';
	// TODO : get rid of channel. Server should know in which channel client is.
	action.channel = $('channel').value;
	action.plugin_name = $('music_selection_plugin').value;
	query.action = action;

	updateJukebox();
}

function joinChannel()
{
	var action = {};
	action.name = 'join_channel';
	action.channel = $('channel').value;
	query.action = action;

	updateJukebox();
}

function nextSong()
{
	var action = {};
	action.name = 'next';
	query.action = action;
	updateJukebox();
}

function previousSong()
{
	var action = {};
	action.name = 'previous';
	query.action = action;
	updateJukebox();
}

function sendCustomJsonQuery(action)
{
	// Destroy the old query if exists and prepare the new custom query
	query = action;
	updateJukebox(false);
}

// @parameter update_timestamp is optional
function updateJukebox(update_timestamp)
{
	setActivityMonitor(true);

	// update graphical stuff
	time = new Date().getTime() / 1000;
	var delta_time = time - last_time;
	UpdateCurrentSongTime(delta_time);
	last_time = time;

	// TODO change refresher call position must be done in body onLoad()
	updateSongTimeRefresh()
	
	if(sending_query == false)
	{
		// timeout has ended or new query arrived and timeout still in progress
		if(query_timer != null)
		{
			clearTimeout(query_timer);
			query_timer = null;
		}
	}
	else
	{
		// query is being sent and new query has arrived
		force_query = true;
		return;
	}

	sending_query = true;
	//    channel = $('channel').value;
	//    server_port = $('server_port').value;

	if(false != update_timestamp)
	{
		query.timestamp = timestamp;
	}

	var identifier = tabs.getFirstTabIdentifierByClassName("DebugTab");
	if(identifier != null)
	{
		tabs.getTabFromUniqueId(identifier).updateSendingQuery(query);
	}

	var query_json = Object.toJSON(query);

	// cleanup query
	query = {};
	new Ajax.Request(url,
	{
		method:'post',
		postBody: query_json,
		onSuccess: function(response)
		{
			var autorefresh = false;
			if($F('cb_autorefresh') != null)
			{
				autorefresh = true;
			}
			setActivityMonitor(false);
			sending_query = false;
			if(force_query == true)
			{
				force_query = false;
				updateJukebox();
			}
			else if(autorefresh == true)
			{
				query_timer = setTimeout("updateJukebox();", 3000);
			}

			var identifier = tabs.getFirstTabIdentifierByClassName("DebugTab");
			if(identifier != null)
			{
				tabs.getTabFromUniqueId(identifier).updateResponse(response);
			}

			var json = response.responseText.evalJSON();

			if(response.responseText == null || response.responseText == '')
			{
				sending_query = false;
			}

			if (json.current_song != null)
			{
				current_song = json.current_song;
				// Get refreshDate
				refreshSongTimeFromAjaxRequestDatetime = new Date().getTime() / 1000;
				UpdateCurrentSong(0);
			}

			if (json.uploaded_files != null)
			{
				tabs.getFirstTabByClassName("UploadTab").treatResponse(json.uploaded_files);
			}

			if (json.timestamp != null)
			{
				timestamp = json.timestamp;
			}
			
			if (json.channel_infos != null)
			{
				var message = '',
					nb;
				// Notification When new user connection or a user left
				if(last_nb_listening_users > json.channel_infos.listener_count.toString())
				{
					nb = last_nb_listening_users - json.channel_infos.listener_count.toString();
					message += nb + ' user';
					if(nb > 1)
					{
						message += 's';
					}
					message += " left the channel";
					showNotification(1, message);
				}
				else if(last_nb_listening_users < json.channel_infos.listener_count.toString())
				{
					nb = json.channel_infos.listener_count.toString() - last_nb_listening_users;
					message += nb + ' user';
					if(nb > 1) 
					{
						message += 's';
					}
					message += " join the channel";
					showNotification(1, message);
				}
				last_nb_listening_users = json.channel_infos.listener_count.toString();

				// Display the nb user listening the channel
				$$('span.count_user_listening').each(function(e)
				{
					var content = '';
					content += json.channel_infos.listener_count.toString();
					e.update(content);
				});
				/*var select = $('channel_select');
				channel = $('channel_select').value;
				select.update('');
				json.channel_infos.channels_available.each(function(a)
				{
					if(a == channel)
					{
						select.insert(new Element('option', {value: a, selected: true}).update(a));
					}
					else
					{
						select.insert(new Element('option', {value: a}).update(a));
					}
				});*/ 
			}
			
			if(json.play_queue != null)
			{
				CleanupPlayQueue();
				playQueueSongs = json.play_queue.songs;
				DisplayPlayQueue();
			}
			
			if(json.search_results != null && json.search_results != 'null')
			{
				// create a new searchTab
				if(undefined == json.search_results.identifier || null == json.search_results.identifier)
				{
					// Adds the new created tab to the tabs container
					var searchTab = new SearchTab(json.search_results);
					var id = tabs.addTab(searchTab);
					if('false' != json.search_results["select"])
					{
						tabs.toggleTab(id);
					}
				}
				else
				{
					// If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed 
					// results
					tabs.getTabFromUniqueId(json.search_results.identifier).updateNewSearchInformations(json.search_results);
					tabs.getTabFromUniqueId(json.search_results.identifier).updateContent();
				}
				// A new search could be initiated from the left pannel so we must automatically expand the right pannel
				ExpandCollection();
			}

			if (json.messages != null && json.messages != 'null')
			{
				json.messages.each(function(message)
				{
					showNotification(message.level, message.message);
				});
			}
			/*
			setActivityMonitor(false);
			sending_query = false;
			//query_timer = setTimeout("updateJukebox();", 1000);
			if(force_query == true)
			{
				force_query = false;
				updateJukebox();
			}
			else
			{
				query_timer = setTimeout("updateJukebox();", 3000);
			}*/
		}, 
		onFailure: function()
		{
			var identifier = tabs.getFirstTabIdentifierByClassName("DebugTab");
			if(identifier != null)
			{
				tabs.getTabFromUniqueId(identifier).updateResponse(null);
			}
			sending_query = false;
		},
		onComplete: function()
		{
			//$('debug').update(response.getAllHeaders());
		}
	});
}



function updateSongTimeRefresh()
{
	if(refreshSongTimeTimer != null)
	{
		clearTimeout(refreshSongTimeTimer);
	}
	refreshSongTimeTimer = setTimeout("updateSongTimeRefresh();", refreshFrequency);
	
	if(current_song == null)
	{
		lastCurrentSongElapsedTime = currentSongElapsedTime;
		$('progressbar').setStyle(
		{
			width: 0 + '%'
		});

		$('player_song_time').update("--- / ---");
		return;
	}
	
	var currentSongElapsedTime = new Date().getTime()/1000 - refreshSongTimeFromAjaxRequestDatetime + current_song.elapsed;
	if(currentSongElapsedTime > current_song.duration)
	{
		currentSongElapsedTime = current_song.duration;
	}
 
	if(null == lastCurrentSongElapsedTime || currentSongElapsedTime > lastCurrentSongElapsedTime)
	{
		var percent = ((currentSongElapsedTime / current_song.duration) * 100);
		$('progressbar').setStyle(
		{
			width: percent + '%'
		});

		$('player_song_time').update(FormatTime(currentSongElapsedTime) + "/" + FormatTime(current_song.duration));
	}
	lastCurrentSongElapsedTime = currentSongElapsedTime;
}

function UpdateCurrentSongTime(delta_time)
{
	if(current_song == null)
	{
		return;
	}

	refreshSongTimeFromAjaxRequestDatetime = new Date().getTime() / 1000;
	current_song.elapsed += delta_time;
	if(current_song.elapsed > current_song.duration)
	{
		current_song.elapsed = current_song.duration;
	}
}

function UpdateCurrentSong(/*delta_time*/)
{
	if(current_song != null)
	{
		var song = '';
		song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
		song += current_song.artist.replace(/'/g,"\\'");
		song += '\',\'equal\', \'artist\',\'artist,album,track,title\',' + search.result_count + ', \'false\' )">' + current_song.artist + '</a> - ';
		song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
		song +=  current_song.album.replace(/'/g,"\\'");
		song += '\',\'equal\', \'album\',\'artist,album,track,title\',' + search.result_count + ' ), \'false\'">' + current_song.album + '</a> - ';
		song += current_song.title;
		$('player_song_title').update(song);
		UpdateCurrentSongTime(0);

		// Change the page title with the current song played
		document.title = "Jukebox - " + current_song.artist + " - " + current_song.album + " - " + current_song.title; 

		// Force refresh
		updateSongTimeRefresh();
	}
}

function ExpandCollection()
{
	$('music_collection_wrapper').show();
	$('expand_collection_button').hide();
	$('collapse_collection_button').show();
	$('page_wrapper').setStyle(
	{
		width: '900px'
	});
}

function CollapseCollection()
{
	$('music_collection_wrapper').hide();
	$('expand_collection_button').show();
	$('collapse_collection_button').hide();
	$('page_wrapper').setStyle(
	{
		width: '280px'
	});
}

function PlayQueueMove(mid, play_queue_index, new_play_queue_index)
{
	var action =
	{
		name: "move_in_play_queue",
		mid: mid,
		play_queue_index: play_queue_index,
		new_play_queue_index: new_play_queue_index
	};

	query.action = action;
	updateJukebox();
}

function PlayQueueShuffle()
{
	var action =
	{
		name: "shuffle_play_queue"
	};
	query.action = action;
	updateJukebox();
}


function PlayQueueDelete(mid, play_queue_index)
{
	var action;
	if(undefined == mid || null == mid || undefined == play_queue_index || null == play_queue_index)
	{
		// Nothing is passed as argument we want to clear all the playlist
		query.action = [];
		for(var i = playQueueSongs.length -1; i >= 0 ; --i)
		{
			action =
			{
				name: "remove_from_play_queue",
				mid: i, // TODO : Caution this is not the currentSong mid must send the right id
				play_queue_index: i
			};
			query.action.push(action);
		}
	}
	else if(Object.prototype.toString.call(mid) === '[object Array]' && Object.prototype.toString.call(play_queue_index) === '[object Array]')
	{
		// We delete all song passed as argument
		query.action = [];
		for(var j = 0, end = Math.min(mid.length, play_queue_index.length); j < end; ++j)
		{
			action =
			{
				name: "remove_from_play_queue",
				mid: mid[j],
				play_queue_index: play_queue_index[j]
			};
			query.action.push(action);
		}        
	}
	else
	{
		action =
		{
			name: "remove_from_play_queue",
			mid: mid,
			play_queue_index: play_queue_index
		};
		query.action = action;
	}
	updateJukebox();
}

function CleanupPlayQueue()
{
	// Create all draggables, once update is done.
	for(var i = 0; i < playQueueSongs.length; i++)
	{
		Droppables.remove('play_queue_song_' + i);
	}
}

function DisplayPlayQueue()
{
	var html = '' +
	'<ul>' +
	'<li id="play_queue_li_first" class="droppable">Play queue' +
		'<div>' +
			'<span class="nb_listening_users"></span>' +
			'<span class="count_user_listening">' + last_nb_listening_users + '</span>' +
		'</div>' +
		'<a href="javascript:void(0)" onclick="PlayQueueShuffle();"><span class="play_queue_shuffle"></span></a>' +
		'<a href="javascript:void(0)" onclick="PlayQueueDelete();"><span class="play_queue_delete"></span></a>' +
	'</li>';

	var currentPQSongIndex = 0;
	var lastPQIndex = playQueueSongs.length - 1;
	playQueueSongs.each(function(song)
	{
		html += '' +
		'<li id="play_queue_li_' + currentPQSongIndex + '" class="droppable">';
			'<div id="play_queue_song_' + currentPQSongIndex + '" class="play_queue_draggable">' +
				'<div id="play_queue_handle_' + currentPQSongIndex + '" class="play_queue_handle">' +
					'<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'' +	song.artist.replace(/'/g,"\\'") + '\',\'equal\', \'artist\',\'artist,album,track, title\',20, \'false\' )">' +
						song.artist +
					'</a>' +
					' - ' +
					'<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'' + song.album.replace(/'/g,"\\'") + '\',\'equal\', \'album\',\'artist,album,track,title\',20, \'false\')">' +
						song.album +
					'</a>' +
					' - ' +
					song.title + ' (' + FormatTime(song.duration) + ')' +
				'</div>' +
				'<a href="javascript:void(0)" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', 0);return false;">' +
					'<span class="play_queue_move_top"></span>' +
				'</a>' +
				'<a href="javascript:void(0)" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', ' + lastPQIndex + ');return false;">' +
					'<span class="play_queue_move_bottom"></span>' +
				'</a>' +
				'<a href="javascript:void(0)" onclick="PlayQueueDelete(1,' + currentPQSongIndex + ');return false;">' +
					'<span class="play_queue_delete"></span>' +
				'</a>' +
			'</div>' +
		'</li>';

		currentPQSongIndex++;
	});
	
	html += '</ul>';
	$('play_queue_content').update(html);
	
	// Create all draggables, once update is done.
	for(var i = 0; i < playQueueSongs.length; i++)
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
		MakePlayQueueSongDroppable('play_queue_li_' + i);
	}
	MakePlayQueueSongDroppable('play_queue_li_first');
}

function MakePlayQueueSongDroppable(droppable_id)
{
	Droppables.add(droppable_id,
	{ 
		accept: ['play_queue_draggable', 'library_draggable'],
		overlap: 'vertical',
		hoverclass: 'droppable_hover',
		onDrop: function(dragged, dropped/*, event*/)
		{
			var old_index,
				song,
				song_mid;
			if(dragged.hasClassName("play_queue_draggable"))
			{
				old_index = parseInt(dragged.id.substring(16));
				song = playQueueSongs[old_index];
				song_mid = song.mid;
				
				var new_index = -1;
				if(dropped.id != "play_queue_li_first")
				{
					new_index = parseInt(dropped.id.substring(14));
				}
				//        alert(old_index + ' to ' + new_index);
				if(new_index <= old_index)
				{
					new_index++;
				}
				if(new_index != old_index)
				{
					PlayQueueMove(song_mid, old_index, new_index)
					
					CleanupPlayQueue();
					var tmp = playQueueSongs[old_index];
					playQueueSongs.splice(old_index, 1);
					playQueueSongs.splice(new_index, 0, tmp);
					DisplayPlayQueue();
				}
			}
			else if(dragged.hasClassName("library_draggable"))
			{
				var tab_index = dragged.id.replace(/.*_([^_]*_[^_]*)_[0-9]*/,"$1");
				old_index = parseInt(dragged.id.replace(/.*_[^_]*_[^_]*_([0-9]*)/,"$1"));
				song = tabs.getTabFromUniqueId(tab_index).server_results[old_index];
				song_mid = song.mid;
				
				var play_queue_index = -1;
				if(dropped.id != "play_queue_li_first")
				{
					play_queue_index = parseInt(dropped.id.substring(14));
				}
				play_queue_index++;

				addToPlayQueue(song_mid, play_queue_index);

				playQueueSongs.splice(play_queue_index, 0, song);
				DisplayPlayQueue();
			}
		}
	});
}

function addOrSelectUploadTab()
{
	var identifier = tabs.getFirstTabIdentifierByClassName("UploadTab");
	if(identifier != null)
	{
		tabs.toggleTab(identifier);
	}
	else
	{
		tabs.toggleTab(tabs.addTab(new UploadTab('Uploader','Uploader')));
	}
}


function addOrSelectDebugTab()
{
	var identifier = tabs.getFirstTabIdentifierByClassName("DebugTab");
	if( identifier != null)
	{
		tabs.toggleTab(identifier);
	}
	else
	{
		tabs.toggleTab(tabs.addTab(new DebugTab('Debug','Debug')));
	}
}

function addOrSelectNotificationTab()
{
	var identifier = tabs.getFirstTabIdentifierByClassName("NotificationTab");
	if(identifier != null)
	{
		tabs.toggleTab(identifier);
	}
	else
	{
		tabs.toggleTab(tabs.addTab(new NotificationTab('Notifications','Notifications')));
	}
}

function addOrSelectCustomQueriesTab()
{
	var identifier = tabs.getFirstTabIdentifierByClassName("CustomQueriesTab");
	if(identifier != null)
	{
		tabs.toggleTab(identifier);
	}
	else
	{
		tabs.toggleTab(tabs.addTab(new CustomQueriesTab('Custom queries','Custom queries')));
	}
}
