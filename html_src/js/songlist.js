/* global Template, FormatTime, Draggable, Droppables */
/* exported Songlist */

var Songlist = this.Songlist = Class.create(
{
	initialize: function(rootCSS, jukebox, skin, DOM, columns, headerActions, songActions, allowDragAndDrop, droppedCallback, allowSearchLinks, checkboxCallback)
	{
		/*this.DOM and this.className are defined by updateContent*/
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.skin = skin;
		this.DOM = DOM;
		this.columns = columns;
		this.allowDragAndDrop = allowDragAndDrop;

		this.songActions = songActions;
		this.headerActions = headerActions;

		this.cookAction(songActions);
		this.cookAction(headerActions);

		this.droppedCallback = droppedCallback;

		this.allowSearchLinks = allowSearchLinks;

		this.checkboxCallback = checkboxCallback;

		this.generateTableId();
	},

	getTableId: function()
	{
		return this.rootCSS + "-songlist-" + this.tableId;
	},

	generateTableId: function()
	{
		this.tableId = new Date().getTime();

		var table = this.DOM.down('table');
		if (table)
		{
			table.id = this.getTableId();
		}
	},

	cookAction: function(actions)
	{
		var that = this;
		actions.each(function(action)
		{
			var tpl = new Template(that.skin.controlButton),
			tplVars =
			{
				root: that.rootCSS,
				name: action.name,
				icon: action.icon
			};

			action.html = tpl.evaluate(tplVars);
		});
	},

	getCellContent: function(song, column, index)
	{
		var that = this;
		
		if (column == 'artist')
		{
			return song.artist;
		}
		else if (column == 'album')
		{
			return song.album;
		}
		else if (column == 'title')
		{
			return song.title;
		}
		else if (column == 'duration')
		{
			return FormatTime(song.duration);
		}
		else if (column == 'track')
		{
			return song.track.split("/")[0];
		}
		else if (column == 'genre')
		{
			return genres[song.genre];
		}
		else if (column == 'controls')
		{
			var cellContent = new Element('span');
			this.songActions.each(function(action)
			{
				var a = new Element('a');
				a.insert(action.html);
				a.on("click", function()
				{
					action.callback(("filename" in song) ? song.filename : song.mid, index, that.songs.length);
				});

				if (action.hidden)
				{
					a.firstDescendant().hide();
				}

				cellContent.insert(a);
			});
			return cellContent;
		}
		else if (column == 'checkbox')
		{
			var input = new Element('input');
			input.addClassName('song-list-checkbox');
			input.type = "checkbox";
			input.on("click", function()
			{
				that.updateCheckboxStates(false);
				if (that.checkboxCallback)
				{
					that.checkboxCallback(input.checked, ("filename" in song) ? song.filename : song.mid, index, that.songs.length);
				}
			});
			return input;
		}
		else if (column == 'filename')
		{
			return song.filename;
		}
		else if (column == 'year')
		{
			return song.year;
		}
		else if (column == 'trackNb')
		{
			var trackNbSlashIndex = song.track.toString().indexOf("/");
			if(trackNbSlashIndex != -1)
			{
				return song.track.split("/")[1];
			}
			return song.trackNb;
		}

		return column;
	},

	getHeaderContent: function(column)
	{
		if (column == 'controls')
		{
			var cellContent = new Element('span');
			this.headerActions.each(function(action)
			{
				var a = new Element('a');
				a.insert(action.html);
				a.on("click", function()
				{
					action.callback();
				});

				if (action.hidden)
				{
					a.firstDescendant().hide();
				}

				cellContent.insert(a);
			});
			return cellContent;
		}
		else if (column == 'checkbox')
		{
			var that = this;
			var input = new Element('input');
			input.addClassName('song-list-header-checkbox');
			input.type = "checkbox";
			input.on("click", function()
			{
				that.updateCheckboxStates(true, input.checked);
				if (that.checkboxCallback)
				{
					that.checkboxCallback(input.checked, -1, -1, 0);
				}
			});
			return input;
		}
		else if (column == 'track')
		{
			return '#';
		}
		else if (column == 'trackNb')
		{
			return 'nb';
		}

		return column.capitalize();
	},

	cellShouldHaveSearchLink: function(column)
	{
		if (!this.allowSearchLinks)
		{
			return false;
		}

		if (column == 'artist' || column == 'album' || column == 'genre')
		{
			return true;
		}
		return false;
	},

	shouldContentBeStatic: function(column)
	{
		if (column == 'checkbox' || column == 'filename' || column == 'controls')
		{
			return true;
		}
		return false;
	},

	insertSong: function(song, currentSongIndex, songlist)
	{
		var that = this;

		var tr = new Element('tr');
		tr.addClassName((currentSongIndex%2 === 0) ? 'roweven' : 'rowodd');
		tr.addClassName(this.rootCSS + '-song-list-song');
		tr.addClassName(this.rootCSS + '-song-list-song-' + currentSongIndex);

		if (this.allowDragAndDrop)
		{
			tr.store('song-mid', song.mid);
			tr.store('song-index', currentSongIndex);
		}

		if (this.columns.indexOf('filename') > -1)
		{
			tr.id = 'song-list-cell-row-' + encodeURIComponent(song.filename);
			tr.store('filename', song.filename);
		}

		// Populate cells
		this.columns.each(function(column)
		{
			var td = new Element('td');
			td.addClassName('song-list-cell');
			td.addClassName('song-list-cell-' + column);
			if (that.shouldContentBeStatic(column))
			{
				td.addClassName('song-list-cell-static');
			}

			var cellContent = that.getCellContent(song, column, currentSongIndex);

			// Generate search link if appropriate
			if (that.cellShouldHaveSearchLink(column))
			{
				var a = new Element('a');
				a.update(cellContent);
				a.on("click", function(evt)
				{
					that.jukebox.getUI().searchCategory(cellContent, column, evt);
				});
				td.insert(a);
			}
			else
			{
				td.update(cellContent);
			}
			tr.insert(td);
		});
		songlist.insert(tr);
		this.songs.push(song);
	},

	setSongs: function(songs)
	{
		this.generateTableId();

		this.songs = [];
		var that = this;

		if (this.allowDragAndDrop)
		{
			this.DOM.select('.' + this.rootCSS+'-song-list-song').each(function(e)
			{
				Droppables.remove(e);
			});
		}

		var songlist = new Element('tbody');


		var headerTr = new Element('tr');
		if (this.allowDragAndDrop)
		{
			headerTr.addClassName(this.rootCSS + '-song-list-dnd-header');
		}

		this.columns.each(function(column)
		{
			var th = new Element('th');
			th.addClassName('song-list-cell');
			th.addClassName('song-list-cell-' + column);

			if (column == 'checkbox' || column == 'controls')
			{
				th.addClassName('nosort');
			}

			th.update(that.getHeaderContent(column));

			headerTr.insert(th);
		});

		songlist.insert(headerTr);

		var currentSongIndex = 0;

		songs.each(function(song)
		{
			that.insertSong(song, currentSongIndex, songlist);

			currentSongIndex++;
		});


		if (this.allowDragAndDrop)
		{
			// Create all draggables, once update is done.
			for(var i = 0, len = songs.length; i < len; i++)
			{
				var draggable = songlist.down('.' + this.rootCSS+'-song-list-song-' + i);

				if(draggable)
				{
					new Draggable(draggable,
					{
						scroll: window,
						constraint: 'vertical',
						revert: true,
						handle: draggable
					});
					this.makeSongDroppable(draggable);
				}
			}
			var first = songlist.down('.' + this.rootCSS + '-song-list-dnd-header');
			if(first)
			{
				first.store('song-index', -1);
				this.makeSongDroppable(first);
			}
		}

		songlist = songlist.wrap('table');
		songlist.id = this.getTableId();
		this.DOM.update(songlist);
	},

	makeSongDroppable: function(droppable)
	{
		var that = this;
		Droppables.add(droppable,
		{
			accept: [this.rootCSS+'-song-list-song'],
			overlap: 'vertical',
			hoverclass: this.rootCSS+'-song-list-song-droppable-hover',
			onDrop: function(dragged, dropped)
			{
				var old_index = dragged.retrieve('song-index');
				var song_mid = dragged.retrieve('song-mid');

				var new_index = dropped.retrieve('song-index');
				if(new_index <= old_index)
				{
					new_index++;
				}
				if(new_index != old_index)
				{
					that.droppedCallback(song_mid, old_index, new_index);

					var tmp = that.songs[old_index];
					that.songs.splice(old_index, 1);
					that.songs.splice(new_index, 0, tmp);
					that.setSongs(that.songs);
				}
			}
		});
	},

	updateCheckboxStates: function(headerCheckboxChanged, headerCheckboxValue)
	{
		var i = 0,
			checkboxes = this.DOM.select('.song-list-checkbox'),
			headerCheckboxes = this.DOM.select('.song-list-header-checkbox'),
			allischecked = true;

		for(i = 0; i < checkboxes.length; ++i)
		{
			if (headerCheckboxChanged)
			{
				checkboxes[i].checked = headerCheckboxValue;
			}
			else
			{
				allischecked = allischecked && checkboxes[i].checked;
			}
		}

		for(i = 0; i < headerCheckboxes.length; ++i)
		{
			if (headerCheckboxChanged)
			{
				headerCheckboxes[i].checked = headerCheckboxValue;
			}
			else
			{
				headerCheckboxes[i].checked = allischecked;
			}
		}
	},

	deleteRow: function(rowId)
	{
		this.DOM.select('tr').each(function(row)
		{
			if (rowId === row.retrieve('filename') || rowId === row.retrieve('song-mid'))
			{
				row.remove();
			}
		});
	},

	addRow: function(song)
	{
		this.insertSong(song, this.songs.length, this.DOM.down('tbody'));
	}
});
