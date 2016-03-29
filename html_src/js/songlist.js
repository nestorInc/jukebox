/* global Template, FormatTime, Draggable, Droppables */
/* exported Songlist */

var Songlist = this.Songlist = Class.create(
{
	initialize: function(rootCSS, jukebox, skin, DOM, columns, headerActions, songActions, allowDragAndDrop, droppedCallback)
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

	getCellContent: function(song, column, index, count)
	{
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
			return song.track;
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
					action.callback(song.mid, index, count);
				});
				cellContent.insert(a);
			});
			return cellContent;
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
				cellContent.insert(a);
			});
			return cellContent;
		}

		return column.capitalize();
	},

	cellShouldHaveSearchLink: function(column)
	{
		if (column == 'artist' || column == 'album' || column == 'genre')
		{
			return true;
		}
		return false;
	},

	setSongs: function(songs)
	{
		this.songs = songs;
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

			th.update(that.getHeaderContent(column));

			headerTr.insert(th);
		});

		songlist.insert(headerTr);

		var currentSongIndex = 0;

		songs.each(function(song)
		{
			// Generate line
			var tr = new Element('tr');
			tr.addClassName((currentSongIndex%2 === 0) ? 'roweven' : 'rowodd');
			tr.addClassName(that.rootCSS + '-song-list-song');
			tr.addClassName(that.rootCSS + '-song-list-song-' + currentSongIndex);

			if (this.allowDragAndDrop)
			{
				tr.store('song-mid', song.mid);
				tr.store('song-index', currentSongIndex);
			}

			// Populate cells
			that.columns.each(function(column)
			{
				var td = new Element('td');
				td.addClassName('song-list-cell');
				td.addClassName('song-list-cell-' + column);

				var cellContent = that.getCellContent(song, column, currentSongIndex, songs.length);

				// Generate search link if appropriate
				if (that.cellShouldHaveSearchLink(column) === true)
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
	}
});
