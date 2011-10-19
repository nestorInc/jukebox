var search = new Object();
search.order_by = 'artist';
search.order_by_way = 'down';
search.search_value = '';
search.search_field = '';
search.first_result = 0;
search.result_count = 10;

var search_results = new Object();
search_results.total_results = 0;
search_results.results = null;

var librarySongs = new Array();

function doSearch () {
    search.search_value = $('search_input').value;
    search.search_field = $('search_field').value;
    search.result_count = 10;
    query.search = search;
    updateJukebox();
}

function addToPlayQueueBottom(mid) {
    addToPlayQueue(mid, playQueueSongs.length);
}

function addToPlayQueue(mid, play_queue_index) {
    var action = new Object();
    action.name = "add_to_play_queue";
    action.mid = mid;
    action.play_queue_index = play_queue_index;
    
    query.action = action;
    updateJukebox();
}


function goToPage (page) {
    search.first_result = (page - 1) * search.result_count;
    doSearch();
}


function CleanupLibrary () {
    // Create all draggables, once update is done.                                                                           
    for (var i = 0; i < librarySongs.length; i++) {
        Droppables.remove('library_song_' + i);
    }
}


function displaySearchResults (server_results) {
    search_results.total_results = server_results.total_results;
    search.result_count = server_results.result_count;
    
    
    var page_count = Math.floor(server_results.total_results / server_results.result_count);
    if (server_results.total_results % server_results.result_count > 0) {
	page_count++;
    }
    
    var current_page = Math.floor(server_results.first_result / server_results.result_count) + 1;

    var pagelist_html = '<p>';
    
    for (var i = 1; i <= page_count; i++) {
	if (i == current_page) {
	    pagelist_html += ' ' + i + ' ';
	} else {
	    pagelist_html += ' <a href="#" onclick="javascript:goToPage(' + i + ');return false;">' + i + '</a> ';
	}
    }
    
    pagelist_html += '</p>';
    
    $$('div.collection_pagelist').each(function(s) {
	s.update(pagelist_html);
    });
//    var lastPQIndex = playQueueSongs.length;
 
    var songlist_html = '';
    songlist_html += '<ul>';
    var i = 0;
    
    librarySongs = server_results.results;

    server_results.results.each(function(s) {
	songlist_html += '<li id="library_li_' + i + '">';
	songlist_html += '<div id="library_song_' + i + '" style="position:relative;" class="library_draggable">';
	songlist_html += '<a href="#" onclick="addToPlayQueue(' + s.mid + ',0);return false;"><span class="add_to_play_queue_top"></span></a>';
	songlist_html += '<a href="#" onclick="addToPlayQueueBottom(' + s.mid + ');return false;"><span class="add_to_play_queue_bottom"></span></a>';
	songlist_html += '<div id="library_handle_' + i + '">' + s.artist + ' - ' + s.title + '</div>';
	songlist_html += '</div></li>';
	i++;
    });
    songlist_html += '</ul>';
    $('collection_content').update(songlist_html);
    
    
    
    
    // Create all draggables, once update is done.
    for (var i = 0; i < librarySongs.length; i++) {
	new Draggable('library_song_' + i, {
	    scroll: window,
	    revert: true,
	    handle: 'library_handle_' + i
	});
    }
}
