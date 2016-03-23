/* jshint loopfunc: true */
/* global $R, FormatTime, TableKit, SortUnique */

this.SearchTab = Class.create(Tab,
{
	initialize: function($super, server_results, rootCSS, jukebox, template)
	{
		this.reloadControllers = true;
		this.iconName = "search";
		this.category = "search";
		this.permanent = false;
		this.pages = [];
		this.sliders = [];
		this.tableKit = null;
		this.DOM = null;

		$super(rootCSS, jukebox, template);

		this.permanent = false;
		this.updateNewSearchInformations(server_results);
	},

	// Implements getOptions
	getOptions: function()
	{
		var opts = {},
			count = 0,
			toSave = ['select_fields', 'search_value', 'search_comparison', 'search_field', 'order_by', 'result_count', 'current_page'];
		for(var i = 0; i < toSave.length; ++i)
		{
			var prop = toSave[i];
			if(this.hasOwnProperty(prop))
			{
				opts[prop] = this[prop]; // Ensure it is a copy, not a reference
				count++;
			}
		}
		return count === 0 ? null : opts;
	},

	updateNewSearchInformations: function(server_results)
	{
		var oldOptions = this.getOptions(),
			search = server_results.search_value,
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
		this.result_count = parseInt(server_results.result_count, 10);
		this.order_by = server_results.order_by;
		this.total_results = server_results.total_results;
		this.server_results = server_results.results || [];

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

		// Update data in storage
		this.refreshStorage(oldOptions);
	},

	goToPage: function(page)
	{
		this.jukebox.search(page,
			this.identifier,
			this.select_fields,
			this.search_value,
			this.search_comparison,
			this.search_field,
			this.order_by,
			this.result_count);
	},

	goToPageOffset: function(pageOffset)
	{
		var newPage = this.current_page + pageOffset;
		if(newPage > this.page_count)
		{
			newPage = this.page_count;
		}

		if (newPage <= 0)
		{
			newPage = 1;
		}

		this.goToPage(newPage);
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

	updateContent: function(DOM)
	{
		this.DOM = DOM;
		if(this.reloadControllers)
		{
			var pagelistClass = this.rootCSS + "-search-pagelist",
				contentClass = this.rootCSS + "-search";

			// Html structure
			var mainTpl = new Template(this.template.main),
				mainTplVars =
				{
					root: this.rootCSS,
					pagelistClass: pagelistClass,
					contentClass: contentClass,
					pageName: this.name
				},
				search_page = mainTpl.evaluate(mainTplVars);
			
			this.DOM.update(search_page);

			// Display sliders and links and init sliders behavior
			this.initAndDisplaySearchControllers(pagelistClass);
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
	initAndDisplaySearchControllers: function(pagelistClass)
	{
		var sliderCSS = this.rootCSS + '-slider',
			sliderCSS2 = this.rootCSS + '-search-slider',
			handleCSS = sliderCSS + '-handle',
			pageListCollection = this.DOM.select('.' + pagelistClass),
			that = this;

		// Only display slider and pages results links if nb pages > 1
		if(this.total_results > 0 && this.page_count > 1)
		{
			//TODO: skin this
			var linksTpl = '<div class="page-count '+this.rootCSS+'-search-page-links">page 12 / 454</div>';

			var sliderTpl = '' +
			'<div class="jukebox-search-page-slider">' +
				'<a class="jukebox-search-fast-rewind-button"><i class="material-icons">fast_rewind</i></a>' +
				'<a class="jukebox-search-left-button"><i class="material-icons">keyboard_arrow_left</i></a>' +
				'<div class="'+sliderCSS2+'">' +
					'<div class="'+sliderCSS+'" style="width: 534px;">' +
						'<div class="'+handleCSS+'"></div>' +
					'</div>' +
				'</div>' +
				'<a class="jukebox-search-right-button"><i class="material-icons">keyboard_arrow_right</i></a>' +
				'<a class="jukebox-search-fast-forward-button"><i class="material-icons">fast_forward</i></a>' +
			'</div>';

			// Display sliders and links
			pageListCollection.each(function(s)
			{
				var replace = new Template(s.innerHTML).evaluate(
				{
					slider: sliderTpl,
					links: linksTpl
				});
				s.update(replace);

				s.down('.jukebox-search-right-button').on('click', that.goToPageOffset.bind(that, 1));
				s.down('.jukebox-search-fast-forward-button').on('click', that.goToPageOffset.bind(that, 3));
				s.down('.jukebox-search-left-button').on('click', that.goToPageOffset.bind(that, -1));
				s.down('.jukebox-search-fast-rewind-button').on('click', that.goToPageOffset.bind(that, -3));
			});
		}
		else
		{
			pageListCollection.each(function(s)
			{
				s.update(); // Empty
			});
		}

		// Fill the pages array used by sliders
		for(var k = 0; k < this.page_count; ++k)
		{
			this.pages.push(k + 1);
		}

		// Init the link list
		this.generatePagesLinks();

		// Init each sliders behavior
		var resultsSliders = this.DOM.select('.'+sliderCSS),
			i = 0;
		resultsSliders.each(function(sliderBox)
		{
			var slider = new Control.Slider(sliderBox.down('.'+handleCSS), sliderBox,
			{
				range: $R(1, that.pages.length),
				values: that.pages,
				sliderValue: that.current_page,
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
			/*var h = sliderBox.down('.'+handleCSS);
			console.log(h.getWidth());
			console.log(h.measure('width'));
			console.log(h.getLayout().get('width'));
			console.log(h.clientWidth);
			*/
			// So we have to hard code the width specified in CSS .jukebox-slider-handle{}
			slider.handleLength = 10;
			slider.setValue(that.current_page); // refresh slider position (avoid bug when current_page > 1 on start in a hidden tab)

			that.sliders.push(slider);
		});
	},

	declareTableHeader: function(tparent)
	{
		var firstSort = this.order_by.split(",")[0],
			J = this.jukebox;

		//-----

		var that = this;
		function manageSort(cell, column, sql)
		{
			var order = "DESC";
			if(firstSort.indexOf(column) != -1)
			{
				cell.addClassName(that.rootCSS + "-search-sortcol");
				if(firstSort.indexOf(order) == -1)
				{
					cell.addClassName(that.rootCSS + "-search-sortasc");
					cell.removeClassName(that.rootCSS + "-search-sortdesc");
				}
				else
				{
					cell.removeClassName(that.rootCSS + "-search-sortasc");
					cell.addClassName(that.rootCSS + "-search-sortdesc");
					order = "ASC";
				}
			}
			else
			{
				cell.removeClassName(that.rootCSS + "-search-sortcol");
			}
			sql = sql.replace('${ORDER}', order);
			cell.on("click", that.sort.bind(that, sql));
		}

		var sql =
		{
			artist: 'artist COLLATE NOCASE ${ORDER}, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC',
			album: 'album COLLATE NOCASE ${ORDER}, track DESC, title COLLATE NOCASE DESC',
			title: 'title COLLATE NOCASE ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC',
			track: 'track ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC',
			genre: 'genre ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC',
			duration: 'duration ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC'
		};

		var tableHeadTpl = new Template(this.template.tableHead),
			tableHeadTplVars = {root: this.rootCSS},
			tr = tableHeadTpl.evaluate(tableHeadTplVars);
		
		tparent.insert(tr); // Inject template

		// For each dom column present in template
		tparent.select('th').each(function(th)
		{
			var classes = th.classNames();

			// Check associated SQL and sort order
			for(var column in sql)
			{
				var expectedCSS = that.rootCSS + '-search-' + column;
				if(classes.include(expectedCSS)) // No column is mandatory in skin
				{
					manageSort(th, column, sql[column]);
					break;
				}
			}
		});

		//-----
		// Controls
		// 
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
		
		var controlsTh = tparent.down('.' + this.rootCSS + '-search-controls');
		if(controlsTh) // Not mandatory in skin
		{
			var title = 'Add search to play queue [Full]'; // See jukebox.js : _addSearchToPlayQueue
			if(this.search_comparison == 'like')
			{
				title = 'Add search to play queue [Current page]';
			}

			this.createControlsCell(controlsTh, funcRandom, funcTop, funcBottom, title);
		}
	},

	// Utility to create the 3 buttons in the last cell of each row (standards rows and header row of the table)
	createControlsCell: function(cell, funcRandom, funcTop, funcBottom, title)
	{
		var addRandom = new Element('a').update('<span class="add-to-play-queue-rand"><i class="material-icons">shuffle</i></span>'),
			addTop = new Element('a').update('<span class="add-to-play-queue-top"><i class="material-icons">vertical_align_top</i></span>'),
			addBottom = new Element('a').update('<span class="add-to-play-queue-bottom"><i class="material-icons">vertical_align_bottom</i></span>');

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

		cell.addClassName('song-list-controls');
	},

	initAndDisplaySearchResults: function()
	{
		var tbody = new Element('tbody'),
			count = this.result_count,
			$content = this.DOM.down('.' + this.rootCSS + "-search"),
			isOdd = true,
			style,
			J = this.jukebox;

		function doSearch(search, category, mouseEvent)
		{
			var focusTab = (mouseEvent.which == 2 || mouseEvent.ctrlKey) ? false : true; // Open in background with middle clic or ctrl+clic

			var orderby = 'artist,album,track,title';
			if (category == 'album')
			{
				orderby = 'track,title'/*,artist*/;
			}

			J.search(1, null, null, search.toString(), 'equal', category, orderby, count, focusTab);
		}
		function createLink(text, search, category)
		{
			var item = new Element('a', {href: 'javascript:;'}).update(text);
			item.on('click', function(evt)
			{
				doSearch(search, category, evt);
			});
			return item;
		}

		if(this.total_results > 0)
		{
			var table = new Element('table').addClassName(this.rootCSS + '-search-table'),
				thead = new Element('thead');

			this.declareTableHeader(thead);

			var possibleColumns = ['artist', 'album', 'title', 'track', 'genre', 'duration', 'controls'],
				columns = [],
				that = this;

			// Get columns according to current thead definition
			thead.select('th').each(function(th)
			{
				var classes = th.classNames();
				for(var i = 0; i < possibleColumns.length; ++i)
				{
					var column = possibleColumns[i];
					if(classes.include(that.rootCSS + "-search-" + column))
					{
						columns.push(column);
						break;
					}
				}
			});

			this.server_results.each(function(s)
			{
				style = isOdd ? "rowodd" : "roweven";
				isOdd = !isOdd;

				var tr = new Element('tr').addClassName(that.rootCSS + '-search-row ' + style);
				tr.store('song', s); // For drag'n drop to playqueue

				for(var i = 0; i < columns.length; ++i) // Only display specified thead columns
				{
					var td = new Element('td');
					switch(columns[i])
					{
						case 'artist':
							var artist = createLink(s.artist, s.artist, 'artist');
							td.update(artist);
							td.addClassName('left-text');
							break;
						case 'album':
							var album = createLink(s.album, s.album, 'album');
							td.update(album);
							td.addClassName('left-text');
							break;
						case 'title':
							td.update(s.title);
							td.addClassName('left-text');
							break;
						case 'track':
							td.update(s.track);
							break;
						case 'genre':
							if(genres[s.genre])
							{
								var genre = createLink(genres[s.genre], s.genre, 'genre');
								td.update(genre);
							}							
							break;
						case 'duration':
							td.update(FormatTime(s.duration));
							break;
						case 'controls':
							that.createControlsCell(td,
								function funcRandom(){J.addToPlayQueueRandom(s.mid);},
								function funcTop(){J.addToPlayQueueTop(s.mid);},
								function funcBottom(){J.addToPlayQueueBottom(s.mid);}
							);
							break;
					}
					tr.insert(td);
				}

				tbody.insert(tr);
			});

			table.insert(tbody).insert(
			{
				top: thead
			});

			// Replace the DOM
			$content.update(table);

			this.tableKit = new TableKit(table,
			{
				sortable: false,
				editable: false,
				trueResize: true,
				keepWidth: true,

				// Fix glitch issue when clicking one of the "Add search to play queue [Current page|Full]" button
				// Happens because of tablekit.js generating a huge <div class="resize-handle"> on mousedown
				// Which leads to a scrollbar in the browser -> mouse no more over the same button -> no click event
				// Anyway we don't need showHandle to true because we already override the resize-handle css...
				showHandle: false
			});
		}
		else // this.total_results == 0
		{
			$content.update("No results found");
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

		this.DOM.select('.' + this.rootCSS + '-search-page-links').each(function(s)
		{
			s.update(); // Empty
			s.insert('Page ' + currentPage + '&nbsp;/&nbsp' + pages[pages.length-1]);
		});
	}
});
