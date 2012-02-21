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
var url = '/api/json';

var playQueueSongs = new Array();

var refreshSongTimeFromAjaxRequestDatetime = null;
var refreshSongTimeTimer = null;
var refreshFrequency = 100;
var lastCurrentSongElapsedTimeUpdate = null;

var tabs = new tabs('tab');

function jsonPrettyPrint (input) {
    var json_hr = JSON.stringify(input, null, "\t");
    json_hr = json_hr.replace(/\n/g, '<br />');
    json_hr = json_hr.replace(/\t/g, ' &nbsp;&nbsp; ');
    return json_hr;
}

function FormatTime (t) {
    t = Number(t);
    var h = Math.floor(t / 3600);
    var m = Math.floor(t % 3600 / 60);
    var s = Math.floor(t % 3600 % 60);
    return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
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

    $('search_input').observe('keypress', function(event){
	    if(event.keyCode == Event.KEY_RETURN) {
	        doSearch();
            Event.stop(event);
	    }
    });
    
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

function sendCustomJsonQuery ( action ) {
    // Destroy the old query if exists and prepare the new custom query
    query = action;
    updateJukebox( false );
}


/*@parameter update_timestamp is optional */
function updateJukebox ( update_timestamp ) {
    setActivityMonitor(true);

    // update graphical stuff
    time = new Date().getTime() / 1000;
    var delta_time = time - last_time;
    UpdateCurrentSongTime(delta_time);
    last_time = time;

    /* TODO change refresher call position must be done in body onLoad()  */
    updateSongTimeRefresh()
    
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

    if( false != update_timestamp ) 
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
                /* Get refreshDate*/
                refreshSongTimeFromAjaxRequestDatetime = new Date().getTime() / 1000;
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
                // The caller must be tabs : ex tabs.displaySearchResults(json.search)
                // create a new searchTab
                if(undefined == json.search_results.identifier || 
                   null == json.search_results.identifier){
                    // Adds the new created tab to the tabs container
                    var searchTab = new SearchTab(json.search_results);
                    tabs.addTab(searchTab);
                } else {
                    // If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed 
                    // results
                    tabs.getTabFromUniqueId(json.search_results.identifier).updateNewSearchInformations(json.search_results);
                    tabs.getTabFromUniqueId(json.search_results.identifier).updateContent();
                }
                // A new search could be initiated form the left pannel so we must automatically expand the right pannel
                ExpandCollection();
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
            //          alert('FAILURE');
            sending_query = false;
            $('debug').update('échec');
        },
        onComplete: function(response) {
            //$('debug').update(response.getAllHeaders());
        }
    });
}



function updateSongTimeRefresh(){
    if( refreshSongTimeTimer != null ){
        clearTimeout(refreshSongTimeTimer);
    }
    refreshSongTimeTimer = setTimeout("updateSongTimeRefresh();", refreshFrequency);
    
    if(current_song == null){
        lastCurrentSongElapsedTime = currentSongElapsedTime;
        $('progressbar').setStyle({
            width: 0 + '%'
        });

        $('player_song_time').update("--- / ---");
        return;
    }
    
    var currentSongElapsedTime = new Date().getTime()/1000 - refreshSongTimeFromAjaxRequestDatetime + current_song.elapsed_time;
    if (currentSongElapsedTime > current_song.total_time) {
        currentSongElapsedTime = current_song.total_time;
    }
 
    if(null == lastCurrentSongElapsedTime || currentSongElapsedTime > lastCurrentSongElapsedTime){
        var percent = ((currentSongElapsedTime / current_song.total_time) * 100);
        $('progressbar').setStyle({
            width: percent + '%'
        });

        $('player_song_time').update(FormatTime(currentSongElapsedTime) + "/" + FormatTime(current_song.total_time));
    }
    lastCurrentSongElapsedTime = currentSongElapsedTime;
}

function UpdateCurrentSongTime (delta_time) {
    if (current_song == null) {
        return;
    }

    refreshSongTimeFromAjaxRequestDatetime = new Date().getTime()/1000;
    current_song.elapsed_time += delta_time;
    if (current_song.elapsed_time > current_song.total_time) {
        current_song.elapsed_time = current_song.total_time;
    }
}

function UpdateCurrentSong (delta_time) {
    if (current_song != null) {
        var song = '';
        song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        song += current_song.artist.replace(/'/g,"\\'");
        song += '\',\'equal\', \'artist\',\'artist,album,title\',\'up\',' + search.result_count + ' )">' + current_song.artist + '</a> - ';
        song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        song +=  current_song.album.replace(/'/g,"\\'");
        song += '\',\'equal\', \'album\',\'artist,album,title\',\'up\',' + search.result_count + ' )">' + current_song.album + '</a> - ';
        song += current_song.title;
        $('player_song_title').update( song );
        UpdateCurrentSongTime (0);
        /* force refresh */
        updateSongTimeRefresh();
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
        width: '881px'
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
    if(undefined == mid || null == mid || undefined == play_queue_index || null == play_queue_index){
        /* Nothing is passed as argument we want to clear all the playlist */
        query.action = new Array();
        for( var i = playQueueSongs.length -1; i >= 0 ; --i){
            var action = new Object();
            action.name = "remove_from_play_queue";
            action.mid = i; /* TODO : Caution this is not the currentSong mid must send the right id*/
            action.play_queue_index = i;
            query.action.push( action );
        }
    } else if( Object.prototype.toString.call( mid ) === '[object Array]' 
               && Object.prototype.toString.call( play_queue_index ) === '[object Array]'){
        /* We delete all song passed as argument */
        query.action = new Array();
        for( var i = 0; i < Math.min(mid.length, play_queue_index.length ); ++i){
            var action = new Object();
            action.name = "remove_from_play_queue";
            action.mid = mid[i];
            action.play_queue_index = play_queue_index[i];
            query.action.push( action );
        }        
    } else {
        var action = new Object();
        action.name = "remove_from_play_queue";
        action.mid = mid;
        action.play_queue_index = play_queue_index;
        query.action = action;
    }
    updateJukebox();
}

function CleanupPlayQueue () {
    // Create all draggables, once update is done.
    for (var i = 0; i < playQueueSongs.length; i++) {
        Droppables.remove('play_queue_song_' + i);
    }
}

function DisplayPlayQueue () {
    var html = '';
    html += '<ul>';
    html += '<li id="play_queue_li_first" class="droppable">Play queue';
    html += '<a href="javascript:void(0)" onclick="PlayQueueDelete();"><span class="play_queue_delete"></span></a>';
    html += '</li>';

    var currentPQSongIndex = 0;
    var lastPQIndex = playQueueSongs.length - 1;
    playQueueSongs.each(function(song) {
        var draggable_id = 'play_queue_song_' + currentPQSongIndex;

        html += '<li id="play_queue_li_' + currentPQSongIndex + '" class="droppable">';
        html += '<div id="play_queue_song_' + currentPQSongIndex + '" class="play_queue_draggable">';
        html += '<div id="play_queue_handle_' + currentPQSongIndex + '" class="play_queue_handle">';
        html += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        html += song.artist.replace(/'/g,"\\'");
        html += '\',\'equal\', \'artist\',\'artist,album,title\',\'up\',20 )">' + song.artist + '</a>';
        html +=' - ';
        html += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        html += song.album.replace(/'/g,"\\'");
        html += '\',\'equal\', \'album\',\'artist,album,title\',\'up\',20)">' + song.album  + '</a>';
        html += ' - ';
        html += song.title + ' (' + FormatTime(song.duration) + ')</div>';
        html += '<a href="javascript:void(0)" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', 0);return false;"><span class="play_queue_move_top"></span></a>';
        html += '<a href="javascript:void(0)" onclick="PlayQueueMove(1,' + currentPQSongIndex + ', ' + lastPQIndex + ');return false;"><span class="play_queue_move_bottom"></span></a>';
        html += '<a href="javascript:void(0)" onclick="PlayQueueDelete(1,' + currentPQSongIndex + ');return false;"><span class="play_queue_delete"></span></a></span></a>';

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
                //        alert(old_index + ' to ' + new_index);
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

