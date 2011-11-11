var channel;
var server_port;
var current_song = null;
var timestamp = 0;

var force_query = false;
var query_timer = null;
var sending_query = false;
var last_time = 0;
var time = 0;

var query = new Object();
var url = '/ch/control';

var playQueueSongs = new Array();

function jsonPrettyPrint (input) {
    var json_hr = JSON.stringify(input, null, "\t");
    json_hr = json_hr.replace(/\n/g, '<br />');
    json_hr = json_hr.replace(/\t/g, ' &nbsp;&nbsp; ');
    return json_hr;
}

function setActivityMonitor(status) {
    var color = 'green';
    
    if (status == true) {
	color = 'orange';
    }
    $('activity_monitor').setStyle({
	backgroundColor: color
    });
}

function initJukebox () {
    ShowDebug(false);
    CollapseCollection();
    setActivityMonitor(false);
    last_time = new Date().getTime() / 1000;
    $('stop_stream').hide();
    
    updateJukebox();
    initNotifications();
}

function setSongSelectionPlugin () {
    var action = new Object();
    action.name = 'select_plugin';
    // TODO : get rid of channel. Server should know in which channel client is.
    action.channel = $('channel').value;
    action.plugin_name = $('music_selection_plugin').value;
    query.action = action;

    updateJukebox();
}

function joinChannel () {
    var action = new Object();
    action.name = 'join_channel';
    action.channel = $('channel').value;
    query.action = action;

    updateJukebox();
}

function nextSong () {
    var action = new Object();
    action.name = 'next';
    query.action = action;
    updateJukebox();
}

function previousSong () {
    var action = new Object();
    action.name = 'previous';
    query.action = action;
    updateJukebox();
}

function updateJukebox () {
    setActivityMonitor(true);
    // update graphical stuff
    time = new Date().getTime() / 1000;
    var delta_time = time - last_time;
    
    UpdateCurrentSongTime(delta_time);
    
    last_time = time;
    
    if (sending_query == false) {
	// timeout has ended or new query arrived and timeout still in progress
	if (query_timer != null) {
	    clearTimeout(query_timer);
	    query_timer = null;
	}
    } else {
	// query is being sent and new query has arrived
	force_query = true;
	return;
    }

    sending_query = true;
//    channel = $('channel').value;
//    server_port = $('server_port').value;	

    query.timestamp = timestamp;

    var query_json = Object.toJSON(query);

    $('debug1').update('<h2>Data sent</h2><p>' + jsonPrettyPrint(query) + '</p>');
    $('debug2').update('<h2>Waiting for response...</h2>');
    // cleanup query

    query = new Object();

    new Ajax.Request(url, {
	method:'post',
	parameters: {query: query_json},
	onSuccess: function(response) {
	    var autorefresh = false;
	    if ($F('cb_autorefresh') != null) {
		autorefresh = true;
	    }
            setActivityMonitor(false);
            sending_query = false;
            if (force_query == true) {
                force_query = false;
                updateJukebox();
            } else if (autorefresh == true) {
                query_timer = setTimeout("updateJukebox();", 3000);
            }



	    if (response.responseText == null || response.responseText == '') {
		sending_query = false;
		$('debug2').update('<img src="images/server_down.jpg" />');
	    } else {
		$('debug2').update('<h2>Data received</h2><p>' + response.responseText + '</p>');
		$('debug2').update('<h2>Data received</h2><p> ' + response.responseText + '</p><h2>JSON response : </h2><p>' + jsonPrettyPrint(response.responseText.evalJSON()) + '</p>');

	    }

	    var json = response.responseText.evalJSON();
	    
	    if (json.current_song != null) {
		current_song = json.current_song;
		UpdateCurrentSong(0);
	    }
	    
	    if (json.timestamp != null) {
		timestamp = json.timestamp;
	    }
	    
	    if (json.channel_infos != null) {
		/*var select = $('channel_select');
		  channel = $('channel_select').value;
		  select.update('');
		  json.channel_infos.channels_available.each(function(a) {
		  if (a == channel) {
		  select.insert(new Element('option', {value: a, selected: true}).update(a));
		  } else {
		  select.insert(new Element('option', {value: a}).update(a));
		  }
		  });*/ 
	    }
	    
	    if (json.play_queue != null) {
		CleanupPlayQueue();
		playQueueSongs = json.play_queue.songs;
		DisplayPlayQueue();
	    }
	    
	    if (json.search_results != null && json.search_results != 'null') {
		//	alert(json.search_results);
		displaySearchResults(json.search_results);
	    }

	    if (json.messages != null && json.messages != 'null') {
		json.messages.each(function(message) {
		    showNotification(message.level, message.message);
		});
	    }
	    /*		
			setActivityMonitor(false);
			sending_query = false;
			//query_timer = setTimeout("updateJukebox();", 1000);
			if (force_query == true) {
			force_query = false;
			updateJukebox();
			} else {
			query_timer = setTimeout("updateJukebox();", 3000);
			}*/
	}, 
	onFailure: function(response) {
	    $('debug2').update('<img src="images/server_down.jpg" />');
	    //	  	alert('FAILURE');
	    sending_query = false;
	    $('debug').update('échec');
	},
	onComplete: function(response) {
	    //$('debug').update(response.getAllHeaders());
	}
    });
}

function UpdateCurrentSongTime (delta_time) {
    if (current_song == null) {
	return;
    }
    current_song.elapsed_time += delta_time;
    if (current_song.elapsed_time > current_song.total_time) {
	current_song.elapsed_time = current_song.total_time;
    }
    var percent = ((current_song.elapsed_time / current_song.total_time) * 100);
    $('progressbar').setStyle({
	width: percent + '%'
    });
}

function UpdateCurrentSong (delta_time) {
    if (current_song != null) {
	$('player_song_title').update(current_song.artist + ' - ' + current_song.title);
	UpdateCurrentSongTime (0);
    }
}

function ShowDebug(show) {
    if (show == true) {
        $('debug_wrapper').show();
        $('show_debug').hide();
        $('hide_debug').show();
    } else {
        $('debug_wrapper').hide();
        $('show_debug').show();
        $('hide_debug').hide();
    }
}

function ExpandCollection () {
    $('music_collection_wrapper').show();
    $('expand_collection_button').hide();
    $('collapse_collection_button').show();
    $('page_wrapper').setStyle({
	width: '681px'
    });
}

function CollapseCollection () {
    $('music_collection_wrapper').hide();
    $('expand_collection_button').show();
    $('collapse_collection_button').hide();
    $('page_wrapper').setStyle({
	width: '280px'
    });
}

function PlayQueueMove(mid, play_queue_index, new_play_queue_index) {
    var action = new Object();
    action.name = "move_in_play_queue";
    action.mid = mid;
    action.play_queue_index = play_queue_index;
    action.new_play_queue_index = new_play_queue_index;

    query.action = action;
    updateJukebox();
}

function PlayQueueDelete(mid, play_queue_index) {
    var action = new Object();
    action.name = "remove_from_play_queue";
    action.mid = mid;
    action.play_queue_index = play_queue_index;

    query.action = action;
    updateJukebox();
}

function CleanupPlayQueue () {
    // Create all draggables, once update is done.                                                                                                                                                                                                                       
    for (var i = 0; i < playQueueSongs.length; i++) {
        Droppables.remove('play_queue_song_' + i);
    }
}

function DisplayPlayQueue () {
    var html = '<ul>';
    html += '<li id="play_queue_li_first" class="droppable">Play queue</li>';
    var currentPQSongIndex = 0;
    var lastPQIndex = playQueueSongs.length - 1;
    playQueueSongs.each(function(song) {
	var draggable_id = 'play_queue_song_' + currentPQSongIndex;

	html += '<li id="play_queue_li_' + currentPQSongIndex + '" class="droppable">';
	html += '<div id="play_queue_song_' + currentPQSongIndex + '" class="play_queue_draggable">';

	html += '<div id="play_queue_handle_' + currentPQSongIndex + '" class="play_queue_handle">' + song.artist + ' - ' + song.title + ' (' + FormatTime(song.duration) + ')</div>';
	html += '<a href="#" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', 0);return false;"><span class="play_queue_move_top"></span></a>';
	html += '<a href="#" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', ' + lastPQIndex + ');return false;"><span class="play_queue_move_bottom"></span></a>';
	html += '<a href="#" onclick="PlayQueueDelete(1,' + currentPQSongIndex + ');return false;"><span class="play_queue_delete"></span></a></span></a>';

	html += '</div></li>';

	currentPQSongIndex++;
    });
    
    html += '</ul>';
    $('play_queue_content').update(html);
    
    // Create all draggables, once update is done.
    for (var i = 0; i < playQueueSongs.length; i++) {
	new Draggable('play_queue_song_' + i, {
	    scroll: window,
	    constraint: 'vertical',
	    revert: true,
	    handle: 'play_queue_handle_' + i,
	    onStart: function(dragged) {
		var id = dragged.element.id;
		id = id.substring(16);
		$('play_queue_li_' + id).addClassName('being_dragged');
	    },
            onEnd: function(dragged) {
                var id = dragged.element.id;
                id = id.substring(16);
                $('play_queue_li_' + id).removeClassName('being_dragged');
            }

	});
	MakePlayQueueSongDroppable('play_queue_li_' + i);
    }
    MakePlayQueueSongDroppable('play_queue_li_first');
}

function MakePlayQueueSongDroppable (droppable_id) {
	Droppables.add(droppable_id, { 
	    accept: ['play_queue_draggable', 'library_draggable'],
	    overlap: 'vertical',
	    hoverclass: 'droppable_hover',
	    onDrop: function(dragged, dropped, event) {
		if (dragged.hasClassName("play_queue_draggable")) {
		    var old_index = parseInt(dragged.id.substring(16));
		    var song = playQueueSongs[old_index];
		    var song_mid = song.mid;
		    
		    var new_index = -1;
		    if (dropped.id != "play_queue_li_first") {
			new_index = parseInt(dropped.id.substring(14));
		    }
		    //		alert(old_index + ' to ' + new_index);
		    if (new_index <= old_index) {
			new_index++;
		    }
		    if (new_index != old_index) {
			PlayQueueMove(song_mid, old_index, new_index)
			
			CleanupPlayQueue();
			var tmp = playQueueSongs[old_index];
			playQueueSongs.splice(old_index, 1);
			playQueueSongs.splice(new_index, 0, tmp);
			DisplayPlayQueue();
		    }
		} else if (dragged.hasClassName("library_draggable")) {
		    var library_index = parseInt(dragged.id.substring(13));
		    var song = librarySongs[library_index];
		    var song_mid = song.mid;
		    
		    var play_queue_index = -1;
		    if (dropped.id != "play_queue_li_first") {
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

function FormatTime (t) {
    var result = '';
    var minutes = Math.floor(t / 60.0);
    var seconds = t - (60.0 * minutes);
    result = minutes + ':' + seconds;
    return result;
}
