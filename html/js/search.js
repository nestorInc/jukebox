//Tool functions
//Todo copy it into library

function sort_unique(arr)
{
	arr = arr.sort(function(a, b)
	{
		return a * 1 - b * 1;
	});
	var ret = [arr[0]];
	for(var i = 1; i < arr.length; i++)
	{
		if(arr[i - 1] !== arr[i])
		{
			ret.push(arr[i]);
		}
	}
	return ret;
}


function generatePagesLinks(identifier, currentPage, currentSelection, nbPages)
{
	var i,
		pages = [];
	// TODO put this constant in a javascript config file
	var threshold = 5;
	var result = '';

	// If nb pages to display > 25 we show only first pages, current selection page, and last pages links
	if(nbPages > 25)
	{
		// TODO put the + 2 in a javascript config file
		for(i = 1; i < Math.ceil(threshold) + 2; ++i)
		{
			if(i > 0 && i <= nbPages)
			{
				pages.push(i);
			}
		}
	}
	else
	{
		for(i = 1; i <= nbPages; ++i)
		{
			pages.push(i);
		}
	}

	// If we want to add focus on another variable we juste to add an entry in this array
	var focusElements = [];
	focusElements[0] = currentPage;
	//Just uncomment the next line to show 3 pages links around slider selection page
	// focusElements[1] = currentSelection;
	pages.push(currentSelection);
	// Hide too far pages algorithm
	for(var k = 0; k < focusElements.length; ++k)
	{
		var currentCount = Math.ceil(threshold / 2);
		for(i = focusElements[k] - Math.ceil(threshold / 2); i < focusElements[k]; ++i)
		{
			if(i > 0 && i <= nbPages)
			{
				currentCount--;
				pages.push(i);
			}
		}

		pages.push(focusElements[k]);
		var currentCount2 = Math.ceil(threshold / 2);
		for(i = focusElements[k] + 1; i < focusElements[k] + Math.ceil(threshold / 2) + 1; ++i)
		{
			if(i > 0 && i <= nbPages)
			{
				currentCount2--;
				pages.push(i);
			}
		}

		// Add missed before pages at the end of the array
		if(currentCount > 0)
		{
			for(i = focusElements[k] + Math.ceil(threshold / 2); i < focusElements[k] + Math.ceil(threshold); ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					pages.push(i);
				}
			}
		}
		else if(currentCount2 > 0)
		{
			for(i = focusElements[k] - Math.ceil(threshold); i < focusElements[k] + Math.ceil(threshold / 2); ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					pages.push(i);
				}
			}
		}
	}

	for(i = nbPages - Math.ceil(threshold); i <= nbPages; ++i)
	{
		if(i > 0 && i <= nbPages)
		{
			pages.push(i);
		}
	}
	pages = sort_unique(pages);
	var lastdisplayedValue = null;
	for(i = 0; i < pages.length; ++i)
	{
		if(lastdisplayedValue != null && lastdisplayedValue != pages[i] - 1)
		{
			result += ".....";
		}
		result += '<a href="javascript:void(0)" onclick="javascript:tabs.getTabFromUniqueId( ' + identifier + ').goToPage(' + pages[i] + ');" class="';

		if(pages[i] == currentPage)
		{
			result += "slider_link_current_page";
		}
		else if(pages[i] == currentSelection)
		{
			result += "slider_link_current_selection";
		}
		else
		{
			result += "slider_link";
		}
		result += '">' + pages[i] + '</a> ';
		lastdisplayedValue = pages[i];
	}

	return result;
}

var SearchTab = Class.create(Tab,
{
	initialize: function(server_results)
	{
		// Search parameters
		this.identifier = server_results.identifier;
		this.updateNewSearchInformations(server_results);

		this.reloadControlers = true;
		this.pages = [];
		this.resultsSlider = null;

		this.sliders = [];

		this.tableKit = null;
	},

	updateNewSearchInformations: function(server_results)
	{
		// tab name 
		if(server_results.search_value == '')
		{
			this.name = "Library";
		}
		else if(server_results.search_comparison == 'equal' && server_results.search_field == 'artist')
		{
			this.name = server_results.search_value;
		}
		else if(server_results.search_comparison == 'equal' && server_results.search_field == 'album')
		{
			if(server_results.results.length > 0)
			{
				// Caution it could generate errors
				this.name = server_results.results[0].artist + " - " + server_results.search_value;
			}
			else
			{
				this.name = server_results.search_value;
			}
		}
		else if(server_results.search_comparison == 'equal' && server_results.search_field == 'genre')
		{
			for(var i = 0; i < genres.length; ++i)
			{
				if(genres[i][1] == server_results.search_value)
				{
					this.name = "Genre:" + genres[i][0];
					break;
				}
			}
		}
		else
		{
			this.name = server_results.search_value;
		}

		this.select_fields = server_results.select_fields;
		this.search_value = server_results.search_value;
		this.search_comparison = server_results.search_comparison;
		this.search_field = server_results.search_field;
		this.first_result = server_results.first_result;
		this.result_count = server_results.result_count;
		this.order_by = server_results.order_by;
		this.total_results = server_results.total_results;
		this.server_results = server_results.results;

		// Gets the number of pages
		this.page_count = Math.floor(this.total_results / this.result_count);
		if(this.total_results % this.result_count > 0)
		{
			this.page_count = this.page_count + 1;
		}

		// Gets the current page number
		this.current_page = Math.floor(this.first_result / this.result_count) + 1;
		if(this.current_page > this.page_count)
		{
			this.current_page = 1;
		}
		this.locked = [];
	},

	// This function is used to add all pages search results in the playqueue
	// TODO add playqueue identifier to parameters
	addSearchToPlayQueue: function(play_queue_position)
	{
		// Create the JSon request
		var action = {};
		action.name = "add_search_to_play_queue";
		action.play_queue_position = play_queue_position;
		action.select_fields = "mid";
		action.search_value = this.search_value;
		action.search_comparison = this.search_comparison
		action.search_field = this.search_field;
		action.order_by = this.order_by;

		if("like" == action.search_comparison)
		{
			action.first_result = this.first_result;
			action.result_count = this.result_count;
		}
		else
		{
			action.first_result = 0;
			action.result_count = null;
		}

		// Send the query to the server
		query.action = action;
		updateJukebox();
	},

	goToPage: function(page)
	{
		doSearch((page - 1) * this.result_count,
			this.identifier,
			this.select_fields,
			this.search_value,
			this.search_comparison,
			this.search_field,
			this.order_by,
			this.result_count);
	},

	sort: function(order_by)
	{
		doSearch(this.page,
			this.identifier,
			this.select_fields,
			this.search_value,
			this.search_comparison,
			this.search_field,
			order_by,
			this.result_count);
	},

	updateContent: function()
	{
		if(true == this.reloadControlers)
		{
			// Save in the current instance the targeted tags and needed informations
			$$('collection_pagelist_' + this.identifier).each(function(s)
			{
				s.remove();
			});

			if(null != $('collection_content_' + this.identifier))
			{
				$('collection_content_' + this.identifier).remove();
			}

			// pre-init html structure
			var search_page = '<br/>' +
			'<div class="collection_pagelist"' +
			' name="collection_pagelist_' + this.identifier + '"></div>' +
			'<div id="collection_content_' + this.identifier + '"></div>' +
			'<div class="collection_pagelist"' +
			' name="collection_pagelist_' + this.identifier + '"></div>';
			$('tabContent_' + this.identifier).update(search_page);

			// Display sliders and links and init sliders behvior
			this.initAndDisplaySearchControllers();
			this.reloadControlers = false;
		}
		else
		{
			var links = generatePagesLinks(this.identifier, this.current_page, this.current_page, this.page_count);

			// Refresh displayed pages
			$$('[name=page_links_' + this.identifier + ']').each(function(s)
			{
				s.update(links);
			});

			// Refresh slider position
			for(var k in this.sliders)
			{
				if(typeof this.sliders[k].setValue === 'function')
				{
					this.locked[k] = true;
					this.sliders[k].setValue(this.current_page);
					this.locked[k] = false;
				}
			}
		}

		// Display search results and init dragabble items
		this.initAndDisplaySearchResults();

	},

	// Update sliders and pages
	initAndDisplaySearchControllers: function()
	{
		var pagelist_html = '';

		// Only display slider and pages results links if nb pages > 1
		if(this.total_results > 0)
		{
			pagelist_html += '<p>'
			if(this.page_count > 1)
			{
				pagelist_html += '<div name="results_slider_' + this.getIdentifier() + '"';
				pagelist_html += ' class="slider" style="width:580px;"><div class="handle"></div></div>';
				pagelist_html += '<div class="page_links" name="page_links_' + this.getIdentifier() + '"></div>';
			}
			pagelist_html += '</p>';
		}

		// Display sliders and links
		$$('[name=collection_pagelist_' + this.getIdentifier() + ']').each(function(s)
		{
			s.update(pagelist_html);
		});

		// Fill the pages array used by sliders
		for(var k = 0; k < this.page_count; ++k)
		{
			this.pages.push(k + 1);
		}

		// Init the link list
		var links = generatePagesLinks(this.identifier, this.current_page, this.current_page, this.page_count);
		$$('[name=page_links_' + this.getIdentifier() + ']').each(function(s)
		{
			s.update(links);
		});

		// Init each sliders behavior
		this.resultsSlider = document.getElementsByName('results_slider_' + this.getIdentifier());
		var tabId = this.getIdentifier();
		for(var i = 0; i < this.resultsSlider.length; i++)
		{
			var currentSlider = new Control.Slider(this.resultsSlider[i].down('.handle'), this.resultsSlider[i],
			{
				range: $R(1, tabs.getTabFromUniqueId(tabId).pages.length),
				values: tabs.getTabFromUniqueId(tabId).pages,
				sliderValue: tabs.getTabFromUniqueId(tabId).current_page || 1,
				id: i,
				identifier: tabId,
				timeout: null,
				lastSelectedValue: null,
				onSlide: function(values)
				{
					var currentTab = tabs.getTabFromUniqueId(this.identifier);
					$$('[name=page_links_' + this.identifier + ']').each(function(s)
					{
						s.update(generatePagesLinks(this.identifier, currentTab.current_page, values, currentTab.page_count));
					});

					for(var k in currentTab.sliders)
					{
						if(k != this.id)
						{
							// Update others sliders values by setting value with the current slider sliding value
							currentTab.locked[k] = true;
							if(typeof currentTab.sliders[k].setValue === 'function')
							{
								// Caution this instruction fire onChange slider event
								currentTab.sliders[k].setValue(values);
							}
							currentTab.locked[k] = false;
						}
					}

					// Auto page selection if stuck on a page
					if(this.lastSelectedValue != values)
					{
						clearTimeout(this.timeout);
						this.timeout = setTimeout("tabs.getTabFromUniqueId('" + this.identifier + "').goToPage(" + values + ");", 400);
					}

					this.lastSelectedValue = values;
				},
				onChange: function(values)
				{
					// Because we use multi slider we don't want to fire onChange event when sliding the other slider
					var currentTab = tabs.getTabFromUniqueId(this.identifier);
					if(!currentTab.locked[this.id])
					{
						clearTimeout(this.timeout);
						if(currentTab.current_page != values)
						{
							tabs.getTabFromUniqueId(this.identifier).goToPage(values);
						}
					}
				}
			});
			this.sliders.push(currentSlider);
		}
	},

	declareTableHeader: function(cellTag)
	{
		var songlist_html = '<tr>';
		songlist_html += '<' + cellTag + ' id="artist" ';
		if(this.order_by.split(",")[0].indexOf("artist") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'artist COLLATE NOCASE DESC, album COLLATE NOCASE ASC, track DESC, title COLLATE NOCASE DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'artist COLLATE NOCASE ASC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
		}
		songlist_html += '>Artist</' + cellTag + '>';

		songlist_html += '<' + cellTag + ' id="album" ';
		if(this.order_by.split(",")[0].indexOf("album") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'album COLLATE NOCASE ASC, track DESC, title COLLATE NOCASE DESC\');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
		}
		songlist_html += '>Album</' + cellTag + '>';


		songlist_html += '<' + cellTag + ' id="title" ';
		if(this.order_by.split(",")[0].indexOf("title") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \' title COLLATE NOCASE DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'title COLLATE NOCASE ASC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC\');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'title COLLATE NOCASE DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC\');"';
		}
		songlist_html += '>Title</' + cellTag + '>';

		songlist_html += '<' + cellTag + ' id="track" ';
		if(this.order_by.split(",")[0].indexOf("track") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'track DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'track ASC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC \');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'track DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC\');"';
		}
		songlist_html += '>Track</' + cellTag + '>';

		songlist_html += '<' + cellTag + ' id="genre" ';
		if(this.order_by.split(",")[0].indexOf("genre") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'genre DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'genre ASC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC,title COLLATE NOCASE DESC \');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'genre DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
		}
		songlist_html += '>Genre</' + cellTag + '>';

		songlist_html += '<' + cellTag + ' id="duration" '
		if(this.order_by.split(",")[0].indexOf("duration") != -1)
		{
			if(this.order_by.split(",")[0].indexOf("DESC") == -1)
			{
				songlist_html += 'class="sortcol sortasc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'duration DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
			}
			else
			{
				songlist_html += 'class="sortcol sortdesc" ';
				songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
				songlist_html += '.sort( \'duration ASC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC,title COLLATE NOCASE DESC \');"';
			}
		}
		else
		{
			songlist_html += ' onclick="javascript:tabs.getTabFromUniqueId( \'' + this.identifier + '\')';
			songlist_html += '.sort( \'duration DESC, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC\');"';
		}
		songlist_html += '>Duration</' + cellTag + '>';

		songlist_html += '<' + cellTag + ' id="actions">';
		songlist_html += '<a onclick="tabs.getTabFromUniqueId(\'' + this.identifier + '\')';
		songlist_html += '.addSearchToPlayQueue(\'rand\');return false;"';
		songlist_html += 'href="javascript:void(0)"><span class="add_to_play_queue_rand"></span></a>';

		// Add research to playqueue on tail
		songlist_html += '<a onclick="tabs.getTabFromUniqueId(\'' + this.identifier + '\')';
		songlist_html += '.addSearchToPlayQueue(\'tail\');return false;"';
		songlist_html += 'href="javascript:void(0)"><span class="add_to_play_queue_bottom"></span></a>';

		// Add research page song in the head playqueue
		songlist_html += '<a onclick="tabs.getTabFromUniqueId(\'' + this.identifier + '\')';
		songlist_html += '.addSearchToPlayQueue(\'head\');return false;"';
		songlist_html += 'href="javascript:void(0)"><span class="add_to_play_queue_top"></span></a>';

		songlist_html += '</' + cellTag + '>';
		songlist_html += '</tr>';
		return songlist_html;
	},

	initAndDisplaySearchResults: function()
	{
		var songcell_html = '',
			songlist_html = '',
			addToPlayQueuemids = [],
			add_page_results = '',
			librarySongs = null,
			identifier = this.getIdentifier(),
			count = this.result_count,
			i = 0,
			isOdd = true,
			style = null;
		if(this.total_results > 0)
		{
			librarySongs = this.server_results;

			librarySongs.each(function(s)
			{
				addToPlayQueuemids.push(s.mid);
				if(isOdd)
				{
					style = "rowodd";
				}
				else
				{
					style = "roweven";
				}
				isOdd = !isOdd;
				songcell_html += '' +
				'<tr id="library_song_' + identifier + '_' + i + '" class="library_draggable ' + style + '">' +
					'<td>' +
						'<a href="javascript:void(0)" onclick="doSearch( 1, null, null,\'' +
					s.artist.replace(/'/g, "\\'") + '\', \'equal\',\'artist\',\'artist,album, track, title\',' + count + ' )">' +
					s.artist + '</a>' +
					'</td>' +
					'<td>' +
						'<a href="javascript:void(0)" onclick="doSearch( 1, null, null,\'' +
					s.album.replace(/'/g, "\\'") + '\', \'equal\',\'album\',\'artist,album, track, title\',' + count + ' )">' +
					s.album + '</a>' +
					'</td>' +
					'<td>' + s.title + '</td>' +
					'<td>' + s.track + '</td>' +
					'<td>';
				for(var j = 0; j < genres.length; ++j)
				{
					if(s.genre == genres[j][1])
					{
						songcell_html += '<a href="javascript:void(0)" onclick="doSearch( 1, null, null,\'';
						songcell_html += s.genre + '\', \'equal\',\'genre\',\'artist,album, track, title\',' + count + ' )">';
						songcell_html += genres[j][0] + '</a>';
						break;
					}
				}
				songcell_html += '</td>' +
					'<td>' + FormatTime(s.duration) + '</td>' +
					'<td>' +
						'<a href="javascript:void(0)" onclick="addToPlayQueueRandom(' + s.mid + ');return false;">' +
							'<span class="add_to_play_queue_rand"></span>' +
						'</a>' +
						'<a href="javascript:void(0)" onclick="addToPlayQueue(' + s.mid + ',0);return false;">' +
							'<span class="add_to_play_queue_top"></span>' +
						'</a>' +
						'<a href="javascript:void(0)" onclick="addToPlayQueueBottom(' + s.mid + ');return false;">' +
							'<span class="add_to_play_queue_bottom"></span>' +
						'</a>' +
					'</td>' +
				'</tr>';

				i++;
			});

			var temp = new Date().getTime();
			songlist_html = add_page_results +
			'<table id="results_filelist_' + this.getIdentifier() + '_' + temp + '" class="resizable">' +
			'<thead>' +
				this.declareTableHeader('th') +
			'</thead>' +
			'<tbody>' +
				songcell_html +
			'</tbody>' +
			'<tfoot>' +
				this.declareTableHeader('td') +
			'</tfoot>' +
			'</table>' +
			add_page_results;

			$('collection_content_' + this.getIdentifier()).update(songlist_html);
			this.tableKit = new TableKit('results_filelist_' + this.getIdentifier() + '_' + temp,
			{
				'sortable': false,
				'editable': false,
				'trueResize': true,
				'keepWidth': true
			});
		}
		else
		{
			// Todo display no results more beautifully
			songlist_html += "no results found";
			$('collection_content_' + this.getIdentifier()).update(songlist_html);
		}

		// Create all draggables, once update is done.
		if(null != librarySongs)
		{
			for(var k = 0; k < librarySongs.length; k++)
			{
				new Draggable('library_song_' + this.getIdentifier() + '_' + k,
				{
					scroll: window,
					ghosting: true,
					revert: function(element)
					{
						element.style.position = "relative";
					},
				});
			}
		}
	}
});