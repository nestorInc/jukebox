this.SearchTab = Class.create(Tab,
{
	initialize: function(jukebox, domContainer, server_results)
	{
		this.reloadControllers = true;
		this.pages = [];
		this.sliders = [];
		this.tableKit = null;

		this.jukebox = jukebox;
		this.dom = domContainer;
		this.identifier = server_results.identifier;
		this.updateNewSearchInformations(server_results);
	},

	updateNewSearchInformations: function(server_results)
	{
		// Tab name
		var search = server_results.search_value,
			field = server_results.search_field;
		if(search === '')
		{
			this.name = 'Library';
		}
		else if(server_results.search_comparison == 'equal')
		{
			if(field == 'artist')
			{
				this.name = 'Artist: ' + search;
			}
			else if(field == 'album')
			{
				this.name = 'Album: ' + search;
			}
			else if(field == 'genre')
			{
				this.name = 'Genre: ' + genres[search];
			}
		}
		else
		{
			this.name = search;
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

	goToPage: function(page)
	{
		this.jukebox.search((page - 1) * this.result_count,
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
		this.jukebox.search(this.page,
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
		if(this.reloadControllers)
		{
			// Clean
			this.dom.select('collection-pagelist-' + this.identifier).each(function(s)
			{
				s.remove();
			});

			var collection_content = $('collection-content-' + this.identifier);
			if(collection_content)
			{
				collection_content.remove();
			}

			// Pre-init html structure
			var search_page = '' +
			'<div class="collection-pagelist" name="collection-pagelist-' + this.identifier + '"></div>' +
			'<div id="collection-content-' + this.identifier + '"></div>' +
			'<div class="collection-pagelist" name="collection-pagelist-' + this.identifier + '"></div>';
			this.dom.down('#tabContent-' + this.identifier).update(search_page);

			// Display sliders and links and init sliders behvior
			this.initAndDisplaySearchControllers();
			this.reloadControllers = false;
		}
		else
		{
			// Refresh displayed pages
			this.generatePagesLinks();

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
		var tabId = this.identifier;

		// Display sliders and links
		var pageListCollection = $$('[name=collection-pagelist-' + tabId + ']');
		pageListCollection.each(function(s)
		{
			s.update(); // empty
		});

		// Only display slider and pages results links if nb pages > 1
		if(this.total_results > 0 && this.page_count > 1)
		{
			// We have to specified a fixed width, 100% doesn't work : the slider is lost
			var music_wrapper_width = this.dom.getWidth();

			var slider = '' +
			'<div name="results-slider-' + tabId + '" class="slider" style="width:' + music_wrapper_width + 'px;">' +
				'<div class="handle"></div>' +
			'</div>';
			var links = '<div class="page-links" name="page-links-' + tabId + '"></div>';

			pageListCollection[0].update('<p>' + slider + links + '</p>');
			pageListCollection[1].update('<p>' + links + slider + '</p>');
		}

		// Fill the pages array used by sliders
		for(var k = 0; k < this.page_count; ++k)
		{
			this.pages.push(k + 1);
		}

		// Init the link list
		this.generatePagesLinks();

		// Init each sliders behavior
		var resultsSlider = $$('[name=results-slider-' + tabId + ']'),
			that = this,
			i = 0;
		resultsSlider.each(function(sliderBox)
		{
			var slider = new Control.Slider(sliderBox.down('.handle'), sliderBox,
			{
				range: $R(1, that.pages.length),
				values: that.pages,
				sliderValue: that.current_page || 1,
				id: i++,
				timeout: null,
				lastSelectedValue: null,
				onSlide: function(value)
				{
					that.generatePagesLinks(value);

					// Update others sliders values by setting value with the current slider sliding value
					for(var k = 0; k < that.sliders; ++k)
					{
						if(k != this.id)
						{
							that.locked[k] = true;
							if(typeof that.sliders[k].setValue === 'function')
							{
								// Caution this instruction fire onChange slider event
								that.sliders[k].setValue(value);
							}
							that.locked[k] = false;
						}
					}

					// Auto page selection if stuck on a page
					if(this.lastSelectedValue != value)
					{
						clearTimeout(this.timeout);
						this.timeout = setTimeout(function()
						{
							that.goToPage(value);
						}, 400);
					}

					this.lastSelectedValue = value;
				},
				onChange: function(value)
				{
					// Because we use multi slider we don't want to fire onChange event when sliding the other slider
					if(!that.locked[this.id]) // Current slider not locked
					{
						clearTimeout(this.timeout);
						if(that.current_page != value)
						{
							that.goToPage(value);
						}
					}
				}
			});

			// Workaround to get correct handle position, whether current tab is visible or not
			// The following methods all return 0 when tab is created in background (display:none)
			/*var h = sliderBox.down('.handle');
			console.log(h.getWidth());
			console.log(h.measure('width'));
			console.log(h.getLayout().get('width'));
			console.log(h.clientWidth);
			*/
			// So we have to hard code the width specified in CSS div.slider div.handle{}
			slider.handleLength = 25;			

			that.sliders.push(slider);
		});
	},

	declareTableHeader: function()
	{
		var firstSort = this.order_by.split(",")[0],
			J = this.jukebox,
			tr = new Element('tr'),
			cellTag = 'th',
			sql;

		//-----

		var that = this;
		function addColumn(column, sql, text)
		{
			var cell = new Element(cellTag, {id: "duration"}).update(text);

			var order = "DESC";
			if(firstSort.indexOf(column) != -1)
			{
				if(firstSort.indexOf(order) == -1)
				{
					cell.className = "sortcol sortasc";
				}
				else
				{
					cell.className = "sortcol sortdesc";
					order = "ASC";
				}
			}
			sql = sql.replace('${ORDER}', order);
			cell.on("click", function()
			{
				that.sort(sql);
			});

			tr.insert(cell);
		}

		sql = 'artist COLLATE NOCASE ${ORDER}, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('artist', sql, 'Artist');

		sql = 'album COLLATE NOCASE ${ORDER}, track DESC, title COLLATE NOCASE DESC';
		addColumn('album', sql, 'Album');

		sql = 'title COLLATE NOCASE ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC';
		addColumn('title', sql, 'Title');
		
		sql = 'track ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC';
		addColumn('track', sql, 'Track');
		
		sql = 'genre ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('genre', sql, 'Genre');

		sql = 'duration ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('duration', sql, 'Duration');

		//-----
		// Controls
		
		function funcRandom()
		{
			J.addSearchToPlayQueueRandom(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}
		function funcTop()
		{
			J.addSearchToPlayQueueTop(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}
		function funcBottom()
		{
			J.addSearchToPlayQueueBottom(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}

		var title = 'Add search to play queue [Full]'; // See jukebox.js : _addSearchToPlayQueue
		if(this.search_comparison == 'like')
		{
			title = 'Add search to play queue [Current page]';
		}

		var cell = this.createControlsCell(cellTag, funcRandom, funcTop, funcBottom, title);
		cell.writeAttribute('id', 'actions');
		tr.insert(cell);

		return tr;
	},

	// Utility to create the 3 buttons in the last cell of each row (standards rows and header row of the table)
	createControlsCell: function(cellTag, funcRandom, funcTop, funcBottom, title)
	{
		var cell = new Element(cellTag),
			addRandom = new Element('a').update('<span class="add-to-play-queue-rand"></span>'),
			addTop = new Element('a').update('<span class="add-to-play-queue-top"></span>'),
			addBottom = new Element('a').update('<span class="add-to-play-queue-bottom"></span>');

		if(title)
		{
			addRandom.writeAttribute('title', title + ' [RANDOM]');
			addTop.writeAttribute('title', title + ' [TOP]');
			addBottom.writeAttribute('title', title + ' [BOTTOM]');
		}

		cell.insert(addTop).insert(
		{
			top: addRandom,
			bottom: addBottom
		});

		addRandom.on('click', funcRandom);
		addTop.on('click', funcTop);
		addBottom.on('click', funcBottom);

		return cell;
	},

	initAndDisplaySearchResults: function()
	{
		var tbody = new Element('tbody'),
			count = this.result_count,
			$content = $('collection-content-' + this.identifier),
			k,
			isOdd = true,
			style,
			J = this.jukebox;
		
		function doSearch(search, category)
		{
			J.search(1, null, null, search.toString(), 'equal', category, 'artist,album,track,title', count, true);
		}
		function createLink(text, search, category)
		{
			var item = new Element('a', {href: 'javascript:void(0)'}).update(text);
			item.on('click', function()
			{
				doSearch(search, category);
			});
			return item;
		}

		if(this.total_results > 0)
		{
			var that = this,
				id = this.identifier,
				i = 0;
			this.server_results.each(function(s)
			{
				style = isOdd ? "rowodd" : "roweven";
				isOdd = !isOdd;

				var artist = createLink(s.artist, s.artist, 'artist'),
					album = createLink(s.album, s.album, 'album');

				var tds =
				[
					new Element('td').insert(artist),
					new Element('td').insert(album),
					new Element('td').update(s.title),
					new Element('td').update(s.track),
					new Element('td'), // genre
					new Element('td').update(FormatTime(s.duration))
				];

				if(genres[s.genre])
				{
					var genre = createLink(genres[s.genre], s.genre, 'genre');
					tds[4].insert(genre);
				}

				//---
				// Controls

				function funcRandom()
				{
					J.addToPlayQueueRandom(s.mid);
				}
				function funcTop()
				{
					J.addToPlayQueueTop(s.mid);
				}
				function funcBottom()
				{
					J.addToPlayQueueBottom(s.mid);
				}
				var controls = that.createControlsCell('td', funcRandom, funcTop, funcBottom);
				tds.push(controls);

				//---

				var tr = new Element('tr',
				{
					id: 'library-song-' + id + '-' + i++
				}).addClassName('library-draggable ' + style);

				for(k = 0; k < tds.length; ++k)
				{
					tr.insert(tds[k]);
				}
				tbody.insert(tr);
			});

			// Compute the table
			var temp = new Date().getTime(),
				tableid = 'results-filelist-' + this.identifier + '-' + temp,
				table = new Element('table', {id: tableid}).addClassName('resizable').addClassName('search-table');

			table.insert(tbody).insert(
			{
				top: new Element('thead').insert(this.declareTableHeader()),
				bottom: new Element('tfoot').insert(this.declareTableHeader())
			});

			// Replace the DOM
			$content.update(table);

			this.tableKit = new TableKit(tableid,
			{
				'sortable': false,
				'editable': false,
				'trueResize': true,
				'keepWidth': true
			});
		}
		else // this.total_results == 0
		{
			$content.update("No results found");
		}

		// Create all draggables, once update is done
		if(this.server_results != null)
		{
			for(k = 0; k < this.server_results.length; k++)
			{
				new Draggable('library-song-' + this.identifier + '-' + k,
				{
					scroll: window,
					ghosting: true,
					revert: function(element)
					{
						element.style.position = "relative";
					}
				});
			}
		}
	},

	generatePagesLinks: function(currentSelection)
	{
		var i,
			len,
			pages = [],
			threshold = 5, // TODO put this constant in a javascript config file
			currentPage = this.current_page,
			nbPages = this.page_count;

		if(typeof currentSelection == "undefined")
		{
			currentSelection = this.current_page;
		}

		// If nb pages to display > 25 we show only first pages, current selection page, and last pages links
		if(nbPages > 25)
		{
			// TODO put the + 2 in a javascript config file
			for(i = 1, len = Math.ceil(threshold) + 2; i < len; ++i)
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

		// If we want to add focus on another variable we just need to add an entry in this array
		var focusElements = [];
		focusElements[0] = currentPage;
		
		// Uncomment the next line to show 3 pages links around slider selection page
		// focusElements[1] = currentSelection;
		
		pages.push(currentSelection);
		
		// Hide too far pages algorithm
		for(var k = 0; k < focusElements.length; ++k)
		{
			var currentCount = Math.ceil(threshold / 2),
				currentCount2 = currentCount;

			for(i = focusElements[k] - currentCount; i < focusElements[k]; ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					currentCount--;
					pages.push(i);
				}
			}

			pages.push(focusElements[k]);

			for(i = focusElements[k] + 1, len = focusElements[k] + Math.ceil(threshold / 2) + 1; i < len; ++i)
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
				for(i = focusElements[k] + Math.ceil(threshold / 2), len = focusElements[k] + Math.ceil(threshold); i < len; ++i)
				{
					if(i > 0 && i <= nbPages)
					{
						pages.push(i);
					}
				}
			}
			else if(currentCount2 > 0)
			{
				for(i = focusElements[k] - Math.ceil(threshold), len = focusElements[k] + Math.ceil(threshold / 2); i < len; ++i)
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

		pages = SortUnique(pages);

		var tab = this;
		function createLink(num, className)
		{
			var item = new Element('a', {href: 'javascript:void(0)'}).addClassName(className).update(num + " ");
			item.on('click', function()
			{
				tab.goToPage(num);
			});
			return item;
		}

		$$('[name=page-links-' + this.identifier + ']').each(function(s)
		{
			s.update(); // Remove all childnodes

			var lastdisplayedValue = null;
			for(i = 0; i < pages.length; ++i)
			{
				if(lastdisplayedValue != null && lastdisplayedValue != pages[i] - 1)
				{
					s.insert(" ..... ");
				}

				var className;
				if(pages[i] == currentPage)
				{
					className = "slider-link-current-page";
				}
				else if(pages[i] == currentSelection)
				{
					className = "slider-link-current-selection";
				}
				else
				{
					className = "slider-link";
				}

				var link = createLink(pages[i], className);
				s.insert(link);

				lastdisplayedValue = pages[i];
			}
		});
	}
});
