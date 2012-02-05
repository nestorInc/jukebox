var results_per_page = 10;

var search = new Object();
search.order_by = 'artist';
search.order_by_way = 'up';
search.search_value = '';
search.search_field = '';
search.first_result = 0;
search.result_count = results_per_page;
var search_results = new Object();
search_results.total_results = 0;
search_results.results = null;

var librarySongs = new Array();

function doSearch ( page ) {
    search.search_value = $('search_input').value;
    search.search_field = $('search_field').value;
    search.result_count = $('results_per_page').value;
    if( undefined == page || null == page ) { 
        search.first_result = 0;
    } else {
        search.first_result = page;
    }
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
    doSearch((page - 1) * results_per_page);
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
    
    
    var page_count = Math.floor(server_results.total_results / results_per_page);
 
    if (server_results.total_results % results_per_page > 0) {
	    page_count++;
    }
    
    var current_page = Math.floor(server_results.first_result / results_per_page) + 1;

    if( current_page > page_count ) {
        current_page = 1;
    }

    var pagelist_html = '<p>';
	pagelist_html += '<div name="results_slider" class="slider"><div class="handle"><span name="currentPage"></div></div>';
    pagelist_html += '</p>';
    
    $$('div.collection_pagelist').each(function(s) {
	s.update(pagelist_html);
    });
//    var lastPQIndex = playQueueSongs.length;
 
    var songlist_html = '';
    songlist_html += '<ul>';
    var i = 0;
    
    librarySongs = server_results.results;
    var grey_bg = false;
    server_results.results.each(function(s) {
    var style = '';
    if (grey_bg == true) {
        style = 'background-color: #DEDEDE;';
    }
	songlist_html += '<li id="library_li_' + i + '">';
	songlist_html += '<div id="library_song_' + i + '" style="position:relative;' + style + '" class="library_draggable">';
	songlist_html += '<a href="#" onclick="addToPlayQueue(' + s.mid + ',0);return false;"><span class="add_to_play_queue_top"></span></a>';
	songlist_html += '<a href="#" onclick="addToPlayQueueBottom(' + s.mid + ');return false;"><span class="add_to_play_queue_bottom"></span></a>';
	songlist_html += '<div id="library_handle_' + i + '">' + s.artist + ' - ' + s.album + ' - '  + s.title + '</div>';
	songlist_html += '</div></li>';
	i++;
    grey_bg = !grey_bg;
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

    var resultsSlider = document.getElementsByName('results_slider');
    var tab = Array();
    var locked = Array()

    /* fill the array for the slider range */
    var pages = Array();
    for(var i = 0; i < page_count; ++i){
        pages.push(i+1);
    }

    /* Init the slider current page label */
    for(var j in document.getElementsByName("currentPage") )
    {
        document.getElementsByName("currentPage")[j].innerHTML = current_page + "/" +  page_count;
    }


    /* Init each sliders */
    for(var i = 0 ; i <  resultsSlider.length; i++ ){
        tab[i] = new Control.Slider(resultsSlider[i].down('.handle'), resultsSlider[i], {
            range: $R(1,pages.length),
            values: pages,
            sliderValue: current_page,
            id:i,
            onSlide: function(values){
                for(var j in document.getElementsByName("currentPage") )
                {
                    document.getElementsByName("currentPage")[j].innerHTML = values + "/" +  page_count ;
                }

                for( var k in tab ){
                    if ( k != this.id ){
                        locked[k]=true;
                        if(typeof tab[k].setValue === 'function') {
                            tab[k].setValue(values);
                        }
                        locked[k]=false;
                    }
                }
            },
            onChange: function(values){
                if( ! locked[this.id] )
                    goToPage(values);
            }
        });
    }
}

function checkAndSendJson () {

    // Check if the textarea is filled
    if( '' == $('custom_json_query').value ){
        alert('please fill the textarea');
    }

    // Check if the textarea contains a valid json query
    var action = null;
    action = JSON.parse( $('custom_json_query').value );

    if ( null != action ) {
        sendCustomJsonQuery( action );
    }

    return false;
}

function fillCustomJsonQuery () {

    var value = $('custom_json_template_list').options[$('custom_json_template_list').selectedIndex].value ;
    var query = new Object();
    var subelt = new Object();

    if( "dummy" == value ) {
        return false;
    }

    if( "clear_form" == value ) {
        $('custom_json_query').value = '';
        $('custom_json_template_list').selectedIndex = 1;
        return false;
    }

    if ( "next" == value ) { 
        subelt.name='next';
    } else if ( "previous" == value ) { 
        subelt.name='previous';
    } else if ( "add_to_play_queue" == value ) { 
        subelt.name="add_to_play_queue";
        subelt.mid=123;
        subelt.play_queue_index=1;
    } else if ( "remove_to_play_queue" == value ) { 
        subelt.name="add_to_play_queue";
        subelt.mid=123;
        subelt.play_queue_index=1;
    } else if ( "move_in_play_queue" == value ) { 
        subelt.name="move_in_play_queue";
        subelt.mid=123;
        subelt.play_queue_index=2;
        subelt.new_play_queue_index=0;
    } else if ( "join_channel" == value ) { 
        subelt.name="join_channel";
        subelt.channel_name="trashman";
    } else if ( "get_news" == value ) {
        subelt.name="get_news";
        subelt.first_result=0;
        subelt.result_count=5;
    } else if ( "search" == value ) { 
        subelt.order_by="artist";
        subelt.order_by_way="down";
        subelt.search_value="muse";
        subelt.search_field="artist";
        subelt.first_result=0;
        subelt.result_count=10;
    }

    query.timestamp = 1317675258;
    if ( "search" == value ){
        query.search=subelt;
    } else {
        query.action=subelt;
    }

    $('custom_json_query').value=JSON.stringify(query , null, "\t");
    $('custom_json_template_list').selectedIndex=1;
    return false;

}

