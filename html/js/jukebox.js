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

var genres = [
    ["Acapella", 123],
    ["Acid", 34],
    ["Acid Jazz", 74],
    ["Acid Punk", 73],
    ["Acoustic", 100],
    ["Humour", 99],
    ["Alternative", 20],
    ["Alternative Rock", 40],
    ["Ambient", 26],
    ["Anime", 145],
    ["Avantgarde", 90],
    ["Ballad", 116],
    ["Bass", 41],
    ["Beat", 135],
    ["Bebob", 85],
    ["Big Band", 96],
    ["Black Metal", 138],
    ["Bluegrass", 89],
    ["Blues", 00],
    ["Booty Bass", 107],
    ["BritPop", 132],
    ["Cabaret", 65],
    ["Celtic", 88],
    ["Chamber Music", 104],
    ["Chanson", 102],
    ["Chorus", 97],
    ["Christian Gangsta", 136],
    ["Christian Rap", 61],
    ["Christian Rock", 141],
    ["Classical", 32],
    ["Classic Rock", 01],
    ["Club", 112],
    ["Club-House", 128],
    ["Comedy", 57],
    ["Contemporary C", 140],
    ["Country", 02],
    ["Crossover", 139],
    ["Cult", 58],
    ["Dance", 03],
    ["Dance Hall", 125],
    ["Darkwave", 50],
    ["Death Metal", 22],
    ["Disco", 04],
    ["Dream", 55],
    ["Drum & Bass", 127],
    ["Drum Solo", 122],
    ["Duet", 120],
    ["Easy Listening", 98],
    ["Electronic", 52],
    ["Ethnic", 48],
    ["Eurodance", 54],
    ["Euro-House", 124],
    ["Euro-Techno", 25],
    ["Fast Fusion", 84],
    ["Folk", 80],
    ["Folklore", 115],
    ["Folk-Rock", 81],
    ["Freestyle", 119],
    ["Funk", 05],
    ["Fusion", 30],
    ["Game", 36],
    ["Gangsta", 59],
    ["Goa", 126],
    ["Gospel", 38],
    ["Gothic", 49],
    ["Gothic Rock", 91],
    ["Grunge", 06],
    ["Hardcore", 129],
    ["Hard Rock", 79],
    ["Heavy Metal", 137],
    ["Hip-Hop", 07],
    ["House", 35],
    ["Indie", 131],
    ["Industrial", 19],
    ["Instrumental", 33],
    ["Instrumental Pop", 46],
    ["Instrumental Rock", 47],
    ["Jazz", 08],
    ["Jazz+Funk", 29],
    ["JPop", 146],
    ["Jungle", 63],
    ["Latin", 86],
    ["Lo-Fi", 71],
    ["Meditative", 45],
    ["Merengue", 142],
    ["Metal", 09],
    ["Musical", 77],
    ["National Folk", 82],
    ["Native US", 64],
    ["Negerpunk", 133],
    ["New Age", 10],
    ["New Wave", 66],
    ["Noise", 39],
    ["Oldies", 11],
    ["Opera", 103],
    ["Other", 12],
    ["Polka", 75],
    ["Polsk Punk", 134],
    ["Pop", 13],
    ["Pop-Folk", 53],
    ["Pop/Funk", 62],
    ["Porn Groove", 109],
    ["Power Ballad", 117],
    ["Pranks", 23],
    ["Euro-Techno", 25],
    ["Fast Fusion", 84],
    ["Folk", 80],
    ["Folklore", 115],
    ["Folk-Rock", 81],
    ["Freestyle", 119],
    ["Funk", 05],
    ["Fusion", 30],
    ["Game", 36],
    ["Gangsta", 59],
    ["Goa", 126],
    ["Gospel", 38],
    ["Gothic", 49],
    ["Gothic Rock", 91],
    ["Grunge", 06],
    ["Hardcore", 129],
    ["Hard Rock", 79],
    ["Heavy Metal", 137],
    ["Hip-Hop", 07],
    ["House", 35],
    ["Indie", 131],
    ["Industrial", 19],
    ["Instrumental", 33],
    ["Instrumental Pop", 46],
    ["Instrumental Rock", 47],
    ["Jazz", 08],
    ["Jazz+Funk", 29],
    ["JPop", 146],
    ["Jungle", 63],
    ["Latin", 86],
    ["Lo-Fi", 71],
    ["Meditative", 45],
    ["Merengue", 142],
    ["Metal", 09],
    ["Musical", 77],
    ["National Folk", 82],
    ["Native US", 64],
    ["Negerpunk", 133],
    ["New Age", 10],
    ["New Wave", 66],
    ["Noise", 39],
    ["Oldies", 11],
    ["Opera", 103],
    ["Other", 12],
    ["Polka", 75],
    ["Polsk Punk", 134],
    ["Pop", 13],
    ["Pop-Folk", 53],
    ["Pop/Funk", 62],
    ["Porn Groove", 109],
    ["Power Ballad", 117],
    ["Pranks", 23],
    ["Primus", 108],
    ["Progressive Rock", 92],
    ["Psychadelic", 67],
    ["Psychedelic Rock", 93],
    ["Punk", 43],
    ["Punk Rock", 121],
    ["Rap", 15],
    ["Rave", 68],
    ["R&B", 14],
    ["Reggae", 16],
    ["Retro", 76],
    ["Revival", 87],
    ["Rhytmic Soul", 118],
    ["Rock", 17],
    ["Rock & Roll", 78],
    ["Salsa", 143],
    ["Samba", 114],
    ["Satire", 110],
    ["Showtunes", 69],
    ["Ska", 21],
    ["Slow Jam", 111],
    ["Slow Rock", 95],
    ["Sonata", 105],
    ["Sound Clip", 37],
    ["Soundtrack", 24],
    ["Southern Rock", 56],
    ["Space", 44],
    ["Speech", 101],
    ["Swing", 83],
    ["Symphonic Rock", 94],
    ["Symphony", 106],
    ["SynthPop", 147],
    ["Tango", 113],
    ["Techno", 18],
    ["Techno-Industrial", 51],
    ["Terror", 130],
    ["Thrash Metal", 144],
    ["Top 40", 60],
    ["Trailer", 70],
    ["Trance", 31],
    ["Tribal", 72],
    ["Trip-Hop", 27],
    ["Vocal", 28]
];



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


    var identifier = tabs.getFirstTabIdentifierByClassName("debugTab");
    if( identifier != null){
        tabs.getTabFromUniqueId(identifier).updateSendingQuery(query);
    }

    var query_json = Object.toJSON(query);

    // cleanup query
    query = new Object();
    new Ajax.Request(url, {
        method:'post',
        postBody: query_json,
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

            var identifier = tabs.getFirstTabIdentifierByClassName("debugTab");
            if( identifier != null){
                tabs.getTabFromUniqueId(identifier).updateResponse(response);
            }

            var json = response.responseText.evalJSON();

            if (response.responseText == null || response.responseText == '') {
                sending_query = false;
            }

            if (json.current_song != null) {
                current_song = json.current_song;
                /* Get refreshDate */
                refreshSongTimeFromAjaxRequestDatetime = new Date().getTime() / 1000;
                UpdateCurrentSong(0);
            }

            if (json.uploaded_files != null) {
                tabs.getFirstTabByClassName("UploadTab").treatResponse(json.uploaded_files);
            }

            if (json.timestamp != null) {
                timestamp = json.timestamp;
            }
            
            if (json.channel_infos != null) {
                /* Display the nb user listening the channel */
                $$('span.count_user_listening').each(function(e){ 
                    content = '';
                    content += json.channel_infos.listener_count.toString();
                    e.update(content);
                });
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
                // create a new searchTab
                if(undefined == json.search_results.identifier || 
                   null == json.search_results.identifier){

                    // Adds the new created tab to the tabs container
                    var searchTab = new SearchTab(json.search_results);
                    id = tabs.addTab(searchTab);
                    if( 'false' != json.search_results["select"]){
                        tabs.toggleTab(id);
                    }
                } else {
                    // If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed 
                    // results
                    tabs.getTabFromUniqueId(json.search_results.identifier).updateNewSearchInformations(json.search_results);
                    tabs.getTabFromUniqueId(json.search_results.identifier).updateContent();
                }
                // A new search could be initiated from the left pannel so we must automatically expand the right pannel
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
            var identifier = tabs.getFirstTabIdentifierByClassName("debugTab");
            if( identifier != null){
                tabs.getTabFromUniqueId(identifier).updateResponse(null);
            }
            
            sending_query = false;
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
    
    var currentSongElapsedTime = new Date().getTime()/1000 - refreshSongTimeFromAjaxRequestDatetime + current_song.elapsed;
    if (currentSongElapsedTime > current_song.duration) {
        currentSongElapsedTime = current_song.duration;
    }
 
    if(null == lastCurrentSongElapsedTime || currentSongElapsedTime > lastCurrentSongElapsedTime){
        var percent = ((currentSongElapsedTime / current_song.duration) * 100);
        $('progressbar').setStyle({
            width: percent + '%'
        });

        $('player_song_time').update(FormatTime(currentSongElapsedTime) + "/" + FormatTime(current_song.duration));
    }
    lastCurrentSongElapsedTime = currentSongElapsedTime;
}

function UpdateCurrentSongTime (delta_time) {
    if (current_song == null) {
        return;
    }

    refreshSongTimeFromAjaxRequestDatetime = new Date().getTime()/1000;
    current_song.elapsed += delta_time;
    if (current_song.elapsed > current_song.duration) {
        current_song.elapsed = current_song.duration;
    }
}

function UpdateCurrentSong (delta_time) {
    if (current_song != null) {
        var song = '';
        song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        song += current_song.artist.replace(/'/g,"\\'");
        song += '\',\'equal\', \'artist\',\'artist,album,title\',\'up\',' + search.result_count + ', \'false\' )">' + current_song.artist + '</a> - ';
        song += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        song +=  current_song.album.replace(/'/g,"\\'");
        song += '\',\'equal\', \'album\',\'artist,album,title\',\'up\',' + search.result_count + ' ), \'false\'">' + current_song.album + '</a> - ';
        song += current_song.title;
        $('player_song_title').update( song );
        UpdateCurrentSongTime (0);
        /* force refresh */
        updateSongTimeRefresh();
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

function PlayQueueShuffle() {
    var action = new Object();
    action.name = "shuffle_play_queue";
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
    html += '<div><span class="nb_listening_users"></span>';
    html += '<span class="count_user_listening">0</span></div>';
    html += '<a href="javascript:void(0)" onclick="PlayQueueShuffle();"><span class="play_queue_shuffle"></span></a>';
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
        html += '\',\'equal\', \'artist\',\'artist,album,title\',\'up\',20, \'false\' )">' + song.artist + '</a>';
        html +=' - ';
        html += '<a href="javascript:void(0)" onclick="javascript:doSearch( 1, null, null,\'';
        html += song.album.replace(/'/g,"\\'");
        html += '\',\'equal\', \'album\',\'artist,album,title\',\'up\',20, \'false\')">' + song.album  + '</a>';
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
                var tab_index = dragged.id.replace(/.*_([^_]*_[^_]*)_[0-9]*/,"$1");
                var old_index = parseInt(dragged.id.replace(/.*_[^_]*_[^_]*_([0-9]*)/,"$1"));
                var song = tabs.getTabFromUniqueId(tab_index).server_results[old_index];
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

function addOrSelectUploadTab() {
    var identifier = tabs.getFirstTabIdentifierByClassName("UploadTab");
    if( identifier != null){
        tabs.toggleTab(identifier);
    } else {
        tabs.toggleTab(tabs.addTab(new uploadTab('Uploader','Uploader')));
    }
}


function addOrSelectDebugTab() {
    var identifier = tabs.getFirstTabIdentifierByClassName("debugTab");
    if( identifier != null){
        tabs.toggleTab(identifier);
    } else {
        tabs.toggleTab(tabs.addTab(new debugTab('Debug','Debug')));
    }
}

function addOrSelectNotificationTab() {
    var identifier = tabs.getFirstTabIdentifierByClassName("notificationTab");
    if( identifier != null){
        tabs.toggleTab(identifier);
    } else {
        tabs.toggleTab(tabs.addTab(new notificationTab('Notifications','Notifications')));
    }
}

function addOrSelectCustomQueriesTab() {
    var identifier = tabs.getFirstTabIdentifierByClassName("customQueriesTab");
    if( identifier != null){
        tabs.toggleTab(identifier);
    } else {
        tabs.toggleTab(tabs.addTab(new customQueriesTab('Custom queries','Custom queries')));
    }
}

