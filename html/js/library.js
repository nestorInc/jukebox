var librarySongs = new Array();
var search = new Object();

search.order_by = 'artist';
search.search_value = '';
search.search_comparison = 'like';
search.search_field = '';
search.first_result = 0;

function doSearch( page, identifier, select_fields,
                   search_value, search_comparison, 
                   search_field, order_by, result_count, select ) {
    if( undefined == identifier || null == identifier || '' == identifier )
        search.identifier = null;
    else
        search.identifier = identifier;

    if( undefined == select || null == select ) {
        search.select="true";
    } else {
        search.select = select;
    }

    if( undefined == select_fields || null == select_fields || '' == select_fields )
        search.select_fields="mid, title, album, artist, track, genre, duration";
    else
        search.select_fields = select_fields;

    if( undefined == search_field || null == search_field ) { 
        search.search_field = $('search_field').value;
    } else {
        search.search_field = search_field;
    }

    if( undefined != search_value && null != search_value ){
            search.search_value = search_value;
    } else {
        if( search.search_field != "genre"){
            search.search_value = $('search_input').value;
        } else {
            search.search_value = $('search_genres').value;
        }
    }

    if( undefined == search_comparison || null == search_comparison ) { 
        if( search.search_field != "genre"){
            search.search_comparison = 'like';
        } else {
            search.search_comparison = 'equal';
        }
    } else {
        search.search_comparison = search_comparison;
    }

    if( undefined == result_count || null == result_count ) { 
        search.result_count = $('results_per_page').value;
    } else {
        search.result_count = result_count;
    }

    if( undefined == page || null == page || 1 == page ) { 
        search.first_result = 0;
    } else {
        search.first_result = page;
    }

    if( undefined == order_by || null == order_by ) {
        search.order_by="artist,album,track,title";
    } else {
        search.order_by = order_by;
    }

    search.search_value = search.search_value;
    query.search = search;

    updateJukebox();
}


/*
 * Display the select_genre input in place of input_value if the selected field is genre
 * Also fills tho select_genre list if empty
 */
function selectAndFillGenres(){
    if( $('search_field').options[$('search_field').selectedIndex].value =='genre'){
        $('search_input').hide();
        $('search_genres').show();
        
        if($('search_genres').options.length == 0){ 
            for(var i=0;i < genres.length; ++i){ 
                var option = document.createElement('option');
                option.value = genres[i][1]; 
                option.appendChild(document.createTextNode(genres[i][0]));
                $('search_genres').appendChild(option);  
            } 
        }
    } else {
        $('search_input').show();
        $('search_genres').hide();
    }
}

function addToPlayQueueBottom(mid) {
    addToPlayQueue(mid, playQueueSongs.length);
}

function addToPlayQueueRandom(mid) {
    addToPlayQueue(mid, Math.floor(Math.random()*playQueueSongs.length));
}


function addToPlayQueue(mid, play_queue_index) {
    if( Object.prototype.toString.call( mid ) === '[object Array]' 
               && Object.prototype.toString.call( play_queue_index ) === '[object Array]'){
        query.action = new Array();
        for( var i = 0; i < Math.min(mid.length, play_queue_index.length ); i++){
            var action = new Object();
            action.name = "add_to_play_queue";
            action.mid = mid[i];
            action.play_queue_index = play_queue_index[i];
            query.action.push( action );
        }   
    } else {
        var action = new Object();
        action.name = "add_to_play_queue";
        action.mid = mid;
        action.play_queue_index = play_queue_index;
        query.action = action;
    }
    updateJukebox();
}

function CleanupLibrary () {
    // Create all draggables, once update is done.                                                                           
    for (var i = 0; i < librarySongs.length; i++) {
        Droppables.remove('library_song_' + i);
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
