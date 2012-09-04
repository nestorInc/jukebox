var librarySongs = [];
var search =
{
	order_by: 'artist',
	search_value: '',
	search_comparison: 'like',
	search_field: '',
	first_result: 0
};

function doSearch( page, identifier, select_fields,
				   search_value, search_comparison, 
				   search_field, order_by, result_count, select )
{
	if(!identifier)
	{
		search.identifier = null;
	}
	else
	{
		search.identifier = identifier;
	}

	if(!select)
	{
		search.select = "true";
	}
	else
	{
		search.select = select;
	}

	if(!select_fields)
	{
		search.select_fields = "mid, title, album, artist, track, genre, duration";
	}
	else
	{
		search.select_fields = select_fields;
	}

	if(!search_field)
	{ 
		search.search_field = $('search_field').value;
	}
	else
	{
		search.search_field = search_field;
	}

	if(search_value)
	{
		search.search_value = search_value;
	}
	else
	{
		if(search.search_field != "genre")
		{
			search.search_value = $('search_input').value;
		}
		else
		{
			search.search_value = $('search_genres').value;
		}
	}

	if(!search_comparison)
	{ 
		if(search.search_field != "genre")
		{
			search.search_comparison = 'like';
		}
		else
		{
			search.search_comparison = 'equal';
		}
	}
	else
	{
		search.search_comparison = search_comparison;
	}

	if(!result_count)
	{ 
		search.result_count = $('results_per_page').value;
	}
	else
	{
		search.result_count = result_count;
	}

	if(!page || 1 == page)
	{
		search.first_result = 0;
	}
	else
	{
		search.first_result = page;
	}

	if(!order_by)
	{
		search.order_by = "artist,album,track,title";
	}
	else
	{
		search.order_by = order_by;
	}

	query.search = search;

	updateJukebox();
}


/**
 * Display the select_genre input in place of input_value if the selected field is genre
 * Also fills tho select_genre list if empty
 */
function selectAndFillGenres()
{
	if($('search_field').options[$('search_field').selectedIndex].value =='genre')
	{
		$('search_input').hide();
		$('search_genres').show();
		
		if($('search_genres').options.length == 0)
		{
			for(var i = 0; i < genres.length; ++i)
			{
				var option = document.createElement('option');
				option.value = genres[i][1]; 
				option.appendChild(document.createTextNode(genres[i][0]));
				$('search_genres').appendChild(option);  
			}
		}
	}
	else
	{
		$('search_input').show();
		$('search_genres').hide();
	}
}

function addToPlayQueueBottom(mid)
{
	addToPlayQueue(mid, playQueueSongs.length);
}

function addToPlayQueueRandom(mid)
{
	addToPlayQueue(mid, Math.floor(Math.random() * playQueueSongs.length));
}

function addToPlayQueue(mid, play_queue_index)
{
	if( Object.prototype.toString.call(mid) === '[object Array]' &&
		Object.prototype.toString.call(play_queue_index) === '[object Array]')
	{
		query.action = [];
		for(var i = 0, end = Math.min(mid.length, play_queue_index.length); i < end; i++)
		{
			var action1 =
			{
				name: "add_to_play_queue",
				mid: mid[i],
				play_queue_index: play_queue_index[i]
			};
			query.action.push(action1);
		}
	}
	else
	{
		var action2 =
		{
			name: "add_to_play_queue",
			mid: mid,
			play_queue_index: play_queue_index
		};
		query.action = action2;
	}
	updateJukebox();
}

function CleanupLibrary()
{
	// Create all draggables, once update is done
	for(var i = 0; i < librarySongs.length; i++)
	{
		Droppables.remove('library_song_' + i);
	}
}

function checkAndSendJson()
{
	// Check if the textarea is filled
	if('' == $('custom_json_query').value)
	{
		alert('Please fill the textarea');
	}

	// Check if the textarea contains a valid json query
	var action = JSON.parse($('custom_json_query').value);
	if(action)
	{
		sendCustomJsonQuery(action);
	}

	return false;
}

function fillCustomJsonQuery()
{
	var value = $('custom_json_template_list').options[$('custom_json_template_list').selectedIndex].value;
	var query = {};
	var subelt = {};

	if("dummy" == value)
	{
		return false;
	}

	if("clear_form" == value)
	{
		$('custom_json_query').value = '';
		$('custom_json_template_list').selectedIndex = 1;
		return false;
	}

	switch(value)
	{
		case "next":
		case "previous":
			subelt.name = value;
			break;
		case "add_to_play_queue":
		case "remove_to_play_queue":
		case "move_in_play_queue":
			subelt = 
			{
				name: value,
				mid: 123,
				play_queue_index: 1
			};
			break;
		case "join_channel":
			subelt =
			{
				name: value,
				channel_name: "trashman"
			};
			break;
		case "get_news":
			subelt = 
			{
				name: value,
				first_result: 0,
				result_count: 5
			};
			break;
		case "search":
			subelt = 
			{
				order_by: "artist",
				search_value: "muse",
				search_field: "artist",
				first_result: 0,
				result_count: 10
			};
			break;
	}
	if(value == "move_in_play_queue")
	{
		subelt.new_play_queue_index = 0;		
	}

	query.timestamp = 1317675258;
	if("search" == value)
	{
		query.search = subelt;
	}
	else
	{
		query.action = subelt;
	}

	$('custom_json_query').value = JSON.stringify(query , null, "\t");
	$('custom_json_template_list').selectedIndex = 1;
	return false;
}
