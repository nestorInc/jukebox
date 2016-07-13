/* jshint nonstandard:true, sub:true */
/* global MusicFieldEditor, Notifications, qq, TableKit, genresOrdered, Songlist */

this.UploadTab = Class.create(Tab,
{
	initialize: function(rootCSS, jukebox, template)
	{
		this.name = "Uploader";
		this.iconName = "cloud_upload";
		this.category = "tail";
		this.permanent = true;
		this.uploader = null;
		this.uploadedFiles = null;
		this.uploadedFilesEdition = null;
		this.lastSendingDeletionIdentifier = null;
		this.lastSendingUpdateIdentifier = null;
		this.lastSendingValidationIdentifier = null;
		this.refresher = null;
		this.tableId = new Date().getTime();
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
		this.DOM = null;
	},

	getUploadedFileEditionFromFilename: function(file_name)
	{
		if(this.uploadedFilesEdition === null)
		{
			return null;
		}
		for(var i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			if(this.uploadedFilesEdition[i].filename == file_name)
			{
				return this.uploadedFilesEdition[i];
			}
		}
		return null;
	},

	deleteUploadedSong: function(file_name)
	{
		if(this.lastSendingDeletionIdentifier === null)
		{
			if( Object.isArray(file_name))
			{
				var fnames = [];
				for(var i = 0; i < file_name.length; ++i)
				{
					fnames.push(unescape(file_name[i]));
				}
				this.lastSendingDeletionIdentifier = fnames;
				this.jukebox.deleteUploadedFile(fnames);
			}
			else
			{
				var fname = unescape(file_name);
				this.lastSendingDeletionIdentifier = fname;
				this.jukebox.deleteUploadedFile(fname);
			}
		}
		else
		{
			Notifications.Display(3, "Please retry after the following song has been deleted: " + this.lastSendingDeletionIdentifier);
		}
	},

	updateUploadedSong: function(file_name)
	{
		if(this.lastSendingUpdateIdentifier === null)
		{
			var tmp;
			var opts;

			if( Object.isArray(file_name))
			{
				var fnames = [];
				opts = [];
				tmp=null;
				for(var i = 0; i < file_name.length; ++i)
				{
					fnames.push(unescape(file_name[i]));
					tmp = this.getUploadedFileEditionFromFilename(fnames[i]);
					opts.push(
					{
						file_name: fnames[i],
						title: tmp.title,
						album: tmp.album,
						artist: tmp.artist,
						year: tmp.year,
						track: tmp.track,
						genre: tmp.genre
					});
				}
				this.lastSendingUpdateIdentifier = fnames;
				this.jukebox.updateUploadedFile(opts);
			}
			else
			{
				var fname = unescape(file_name);
				this.lastSendingUpdateIdentifier = fname;
				tmp = this.getUploadedFileEditionFromFilename(fname);
				opts =
				{
					file_name: fname,
					title: tmp.title,
					album: tmp.album,
					artist: tmp.artist,
					year: tmp.year,
					track: tmp.track,
					genre: tmp.genre
				};
				this.jukebox.updateUploadedFile(opts);
			}
		}
		else
		{
			Notifications.Display(3, "Please retry after the following song has been updated: " + this.lastSendingUpdateIdentifier);
		}
	},

	validateUploadedSong: function(file_name)
	{
		if(this.lastSendingValidationIdentifier === null)
		{
			if( Object.isArray(file_name))
			{
				var fnames = [];
				for(var i = 0; i < file_name.length; ++i)
				{
					fnames.push(unescape(file_name[i]));
				}
				this.lastSendingValidationIdentifier = fnames;
				this.jukebox.validateUploadedFile(fnames);
			}
			else
			{
				var fname = unescape(file_name);
				this.lastSendingValidationIdentifier = fname;
				this.jukebox.validateUploadedFile(fname);
			}
		}
		else
		{
			Notifications.Display(3, "Please retry after the following song has been validated: " + this.lastSendingValidationIdentifier);
		}
	},

	deletionResponse: function(ret, message)
	{
		var id = null;

		if( Object.isArray(this.lastSendingDeletionIdentifier))
		{
			id = this.lastSendingDeletionIdentifier[0];
			this.lastSendingDeletionIdentifier.shift();
		}
		else
		{
			id = this.lastSendingDeletionIdentifier;
		}

		// Wether success or error, reset the last sending identifier to allow a new validation

		if( !Object.isArray(this.lastSendingDeletionIdentifier) || this.lastSendingDeletionIdentifier.length === 0 )
		{
			this.lastSendingDeletionIdentifier = null;
		}

		if(ret == "success")
		{
			if(id !== null)
			{
				this.removeSongFromList(id);

				Notifications.Display(2, "Song " + id + " sucessfully deleted");
			}
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
	},

	updateResponse: function(ret, message)
	{
		var lastId = null;
		if( Object.isArray(this.lastSendingUpdateIdentifier) )
		{
			lastId = escape(this.lastSendingUpdateIdentifier[0]);
			this.lastSendingUpdateIdentifier.shift();
		}
		else
		{
			lastId = escape(this.lastSendingUpdateIdentifier);
		}

		if(ret == "success")
		{
			Notifications.Display(1, message);

			// TOTO: handle action button visibility within song list
			var rootCSS = this.rootCSS,
			$uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files'),
			$selector = $uploaded_files.down('[id="song-list-cell-row-' + lastId + '"]');

			// Delete all modified styles
			$selector.select('.'+rootCSS+'-uploaded-file-modified').each(function(e)
			{
				e.removeClassName(rootCSS+'-uploaded-file-modified');
			});

			// Hide update
			$selector.select('.'+rootCSS+'-update').each(function(e)
			{
				e.hide();
			});

			// Show validate
			$selector.select('.'+rootCSS+'-validate').each(function(e)
			{
				e.show();
			});
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}

		if( !Object.isArray(this.lastSendingUpdateIdentifier) || this.lastSendingUpdateIdentifier.length === 0 )
		{
			this.lastSendingUpdateIdentifier = null;
		}
	},

	validationResponse: function(ret, message)
	{
		var id = null;

		if( Object.isArray(this.lastSendingValidationIdentifier) )
		{
			id = escape(this.lastSendingValidationIdentifier[0]);
			this.lastSendingValidationIdentifier.shift();
		}
		else
		{
			id = escape(this.lastSendingUpdateIdentifier);
		}

		// Wether success or error, reset the last sending identifier to allow a new validation

		if( !Object.isArray(this.lastSendingValidationIdentifier) || this.lastSendingValidationIdentifier.length === 0 )
		{
			this.lastSendingValidationIdentifier = null;
		}

		if(ret == "success")
		{
			Notifications.Display(1, message);
			if(id !== null)
			{
				this.removeSongFromList(id);
			}
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
	},

	treatResponse: function(resp)
	{
		if(resp.action_response)
		{
			var obj = resp.action_response,
				ret = obj["return"],
				msg = obj["message"];
			switch(obj.name)
			{
				case "validate_uploaded_file":
					this.validationResponse(ret, msg);
					break;
				case "delete_uploaded_file":
					this.deletionResponse(ret, msg);
					break;
				case "update_uploaded_file":
					this.updateResponse(ret, msg);
					break;
			}
		}

		if(resp.files)
		{
			this.displayUploadedFiles(resp.files);
		}
	},

	change_global_action: function()
	{
		var select = this.DOM.down('.'+this.rootCSS+'-upload-global-action-select'),
			selectedOption = select.options[select.selectedIndex].value,
			input = this.DOM.down('.'+this.rootCSS+'-upload-global-action-input'),
			genres = this.DOM.down('.'+this.rootCSS+'-upload-global-action-genre-select'),

			min_idx = this.DOM.down('.'+this.rootCSS+'-upload-global-min-idx'),
			max_idx = this.DOM.down('.'+this.rootCSS+'-upload-global-max-idx'),
			select_dst = this.DOM.down('.'+this.rootCSS+'-upload-global-action-fill-dst');

		if( selectedOption === "genre")
		{
			input.hide();
			min_idx.hide();
			max_idx.hide();
			select_dst.hide();
			genres.show();
		}
		else if(selectedOption === "fillfromfilename")
		{
			min_idx.show();
			max_idx.show();
			select_dst.show();
			genres.hide();
			input.hide();
		}
		else if(selectedOption === "validate" ||
				selectedOption === "update" ||
				selectedOption === "delete")
		{
			input.hide();
			genres.hide();
			select_dst.hide();
			min_idx.hide();
			max_idx.hide();
		}
		else
		{
			input.show();
			genres.hide();
			min_idx.hide();
			max_idx.hide();
			select_dst.hide();
		}
	},

	change_global_fill_labels: function()
	{
		var select_dst = this.DOM.down('.'+this.rootCSS+'-upload-global-action-fill-dst'),
			dst_value = select_dst.options[select_dst.selectedIndex].value,
			max_idx = this.DOM.down('.'+this.rootCSS+'-upload-global-max-idx');

		var max = "max";
		if(dst_value === "track")
		{
			max = "len";
		}
		if(isNaN(max_idx.value))
		{
			max_idx.value = max;
		}
		max_idx.stopObserving("click");
		max_idx.stopObserving("blur");
		max_idx.on("click", this.clean_numeric_field.bind(this, max_idx, ""));
		max_idx.on("blur", this.clean_numeric_field.bind(this, max_idx, max));
	},

	clean_numeric_field: function(element, value)
	{
		if(isNaN(parseInt(element.value,10)))
		{
			element.value = value;
		}
	},

	apply_global_modifications: function()
	{
		var i = 0,
			elements = this.DOM.select('.song-list-checkbox'),
			select = this.DOM.down('.'+this.rootCSS+'-upload-global-action-select'),
			selectedOption = select.options[select.selectedIndex].value,
			input = this.DOM.down('.'+this.rootCSS+'-upload-global-action-input'),
			genres = this.DOM.down('.'+this.rootCSS+'-upload-global-action-genre-select'),
			min_input = this.DOM.down('.'+this.rootCSS+'-upload-global-min-idx'),
			max_input = this.DOM.down('.'+this.rootCSS+'-upload-global-max-idx'),
			select_dst = this.DOM.down('.'+this.rootCSS+'-upload-global-action-fill-dst'),
			dst_value = select_dst.options[select_dst.selectedIndex].value,
			done = 0,
			identifiers = [];

		if( selectedOption !== "genre" &&
			selectedOption !== "delete" &&
			selectedOption !== "update" &&
			selectedOption !== "validate" &&
			selectedOption !== "fillfromfilename" &&
			input.value.length === 0)
		{
			Notifications.Display(4, "Global textfield empty");
			return;
		}

		for(i = 0; i < elements.length; ++i)
		{
			if(elements[i].checked)
			{
				done++;

				var tr = elements[i].up("tr"),
					td = null,
					form = null,
					fname = null;

				if( selectedOption === "artist" ||
					selectedOption === "album" ||
					selectedOption === "year" ||
					selectedOption === "genre" ||
					selectedOption === "trackNb" )
				{
					td = tr.down('.song-list-cell-' + selectedOption);
					form = td.down("form");
					this.tableKit.editCell(td);
					if (selectedOption === "genre")
					{
						td.down("select").selectedIndex = genres.selectedIndex;
					}
					else
					{
						td.down("input[type=text]").value = input.value;
					}
					TableKit.Editable.getCellEditor(td).submit(td, form);
				}
				else if( selectedOption === "delete" || selectedOption === "update" || selectedOption === "validate")
				{
					fname = unescape(tr.id.split('song-list-cell-row-')[1]);
					identifiers.push(fname);
				}
				else if( selectedOption === "fillfromfilename" )
				{
					if( dst_value  === "title")
					{
						td = tr.down('.song-list-cell--title');
					}
					else if( dst_value  === "album")
					{
						td = tr.down('.song-list-cell-album');
					}
					else if( dst_value  === "artist")
					{
						td = tr.down('.song-list-cell-artist');
					}
					else if( dst_value  === "track")
					{
						td = tr.down('.song-list-cell-track');
					}

					fname = unescape(tr.id.split('song-list-cell-row-')[1]).replace(".mp3","");
					form = td.down("form");
					this.tableKit.editCell(td);

					var min_val = parseInt(min_input.value, 10),
						max_val = parseInt(max_input.value, 10),
						field = td.down("input[type=text]");

					if( !isNaN(min_val) &&
						!isNaN(max_val) )
					{
						if( dst_value  === "track" )
						{
							field.value = fname.substring(min_val, min_val + max_val);
						}
						else
						{
							field.value = fname.substring(min_val, fname.length - max_val);
						}
					}
					else if ( !isNaN(min_val) && isNaN(max_val) )
					{
						field.value = fname.substring(min_val);
					}
					else
					{
						field.value = fname;
					}
					field.value = field.value.trim();

					TableKit.Editable.getCellEditor(td).submit(td, form);
				}
			}
		}

		if(done > 0 && identifiers.length > 0)
		{
			if( selectedOption === "delete" )
			{
				this.deleteUploadedSong(identifiers);
			}
			else if( selectedOption === "update" )
			{
				this.updateUploadedSong(identifiers);
			}
			else if( selectedOption === "validate" )
			{
				this.validateUploadedSong(identifiers);
			}
		}

		if(done === 0)
		{
			Notifications.Display(4, "You must select files from the uploaded list");
			return;
		}
	},

	removeSongFromList: function(filename)
	{
		// Remove from arrays
		var i, len;
		for(i = 0, len = this.uploadedFiles.length; i < len; ++i)
		{
			if(this.uploadedFiles[i].filename == filename)
			{
				this.uploadedFiles.splice(i, 1);
				this.uploadedFilesEdition.splice(i, 1); // at same index
				break;
			}
		}

		// Remove from song list
		this.songList.deleteRow(filename);
	},

	displayUploadedFiles: function(uploaded_files)
	{
		this.scheduleUpdate();

		var i, j, len,
			found = false;

		if(this.uploadedFiles === null || this.uploadedFilesEdition === null)
		{
			// First time setup
			this.uploadedFiles = [];
			this.uploadedFilesEdition = [];

			// Editable
			this.makeCellEditable("song-list-cell-artist");
			this.makeCellEditable("song-list-cell-album");
			this.makeCellEditable("song-list-cell-title");
			this.makeCellEditable("song-list-cell-year");
			this.makeCellEditable("song-list-cell-track");
			this.makeCellEditable("song-list-cell-trackNb");
			this.makeCellEditable("song-list-cell-genre");

			this.makeCellEditable("song-list-cell-checkbox");
			this.makeCellEditable("song-list-cell-filename");
			this.makeCellEditable("song-list-cell-controls");

			this.songList.setSongs(this.uploadedFiles);

			this.refreshTableDisplay();
		}

		// Find deleted lines
		var deleteLines = [];
		for(j = 0, len = this.uploadedFiles.length; j < len; ++j)
		{
			found = false;
			for(i = 0; i < uploaded_files.length; ++i)
			{
				if(uploaded_files[i].filename == this.uploadedFiles[j].filename)
				{
					found = true;
					break;
				}
			}
			if(!found)
			{
				deleteLines.push(this.uploadedFiles[j].filename);
			}
		}

		// Deletes all deleted lines
		for(i = 0; i < deleteLines.length; ++i)
		{
			this.removeSongFromList(deleteLines[i]);
		}

		// Find files to add
		var newLines = [];
		for(i = 0, len = uploaded_files.length; i < len; ++i)
		{
			found = false;
			for(j = 0; j < this.uploadedFiles.length; ++j)
			{
				if(uploaded_files[i].filename == this.uploadedFiles[j].filename)
				{
					found = true;
					break;
				}
			}
			if(!found)
			{
				newLines.push(uploaded_files[i]);
			}
		}

		// Add files to references
		for(i = 0, len = newLines.length; i < len; ++i)
		{
			//TODO: clone with Extend(true, {}, object);
			this.uploadedFiles.push(Object.toJSON(newLines[i]).evalJSON());
			this.uploadedFilesEdition.push(Object.toJSON(newLines[i]).evalJSON());

			this.songList.addRow(newLines[i]);

			this.removeFileFromQQUpload(newLines[i].filename);
		}

		// We have to reinit tablekit when adding new songs
		if(newLines.length > 0)
		{
			this.refreshTableDisplay();
		}
	},

	refreshTableDisplay: function()
	{
		this.songList.generateTableId();
		this.tableKit = new TableKit(this.songList.getTableId(),
			{
				'sortable': true,
				'editable': true,
				'trueResize': true,
				'keepWidth': true
			});
	},

	makeCellEditable: function(name)
	{
		var obj = new MusicFieldEditor(name, this.rootCSS, this.uploadedFiles, this.uploadedFilesEdition);
		TableKit.Editable.addCellEditor(obj);
	},

	removeFileFromQQUpload: function(filename)
	{
		this.DOM.select('.'+this.rootCSS+'-file-uploader .qq-upload-success').each(function(element)
		{
			if(element.down('.qq-upload-file').innerHTML == filename)
			{
				element.remove();
				Notifications.Display(1, 'Informations for ' + filename + 'successfully retrieved.');
			}
		});
	},

	getUploadedFiles: function()
	{
		if (this.jukebox.getAutoRefresh()) {
			this.jukebox.getUploadedFiles();
		} else {
			this.scheduleUpdate();
		}
	},

	clear: function()
	{
		clearTimeout(this.refresher);
		this.refresher = null;

		if(this.uploader._handler._queue.length > 0)
		{
			Notifications.Display(1, "All current uploads canceled.");
		}
		this.uploader._handler.cancelAll();
	},

	scheduleUpdate: function()
	{
		var that = this;
		// Check for new files in 5 seconds
		clearTimeout(this.refresher);
		this.refresher = setTimeout(function()
		{
			that.getUploadedFiles();
		}, 5000);
	},

	updateContent: function(DOM)
	{
		var uploadTpl = new Template(this.template.main),
			uploadTplVars =
			{
				root: this.rootCSS,
				title: this.name
			},
			upload_form = uploadTpl.evaluate(uploadTplVars);

		this.DOM = DOM;
		this.DOM.update(upload_form);

		// Init upload button behavior
		this.uploader = new qq.FileUploader(
		{
			element: this.DOM.down('.'+this.rootCSS+'-file-uploader'),
			action: 'upload',
			params:
			{
				id: this.identifier
			},
			allowedExtensions: ['mp3'],
			showMessage: function (msg)
			{
				Notifications.Display(4, msg);
			}
		});

		var headerActions = [];
		var songActions = [
			{ name: 'update', icon: 'done', callback: this.updateUploadedSong.bind(this), hidden: true },
			{ name: 'validate', icon: 'file_upload', callback: this.validateUploadedSong.bind(this) },
			{ name: 'delete', icon: 'delete_forever', callback: this.deleteUploadedSong.bind(this) }
		];

		var columns = [ 'checkbox', 'filename', 'artist', 'album', 'title', 'year', 'track', 'trackNb', 'genre', 'controls' ];
		this.songList = new Songlist(this.rootCSS, this.jukebox, this.template, this.DOM.down('.' + this.rootCSS + "-uploaded-files"),
							columns, headerActions, songActions, // Content
							false, null, // Drag and drop
							false, // Disable search links
							null);

		// Setup batch controls
		var tableControllerTpl = new Template(this.template.tableController),
				tableControllerTplVars = {root: this.rootCSS},
				controller = tableControllerTpl.evaluate(tableControllerTplVars);

		this.DOM.down('.'+this.rootCSS+'-upload-batch-controls').update(controller);

		this.DOM.down('.'+this.rootCSS+'-upload-global-submit').on("click",this.apply_global_modifications.bind(this));

		var genres = this.DOM.down('.'+this.rootCSS+'-upload-global-action-genre-select');
		//fill genre global list
		for(var i = 0, len = genresOrdered.length; i < len; ++i)
		{
			var genre = genresOrdered[i],
			option = document.createElement('option');
			option.value = genre.id;
			option.appendChild(document.createTextNode(genre.name));
			genres.appendChild(option);
		}
		genres.hide();
		var min_idx = this.DOM.down('.'+this.rootCSS+'-upload-global-min-idx'),
			max_idx = this.DOM.down('.'+this.rootCSS+'-upload-global-max-idx'),
			select_dst = this.DOM.down('.'+this.rootCSS+'-upload-global-action-fill-dst');

		select_dst.on("change", this.change_global_fill_labels.bind(this));

		min_idx.on("click", this.clean_numeric_field.bind(this, min_idx, ""));
		max_idx.on("click", this.clean_numeric_field.bind(this, max_idx, ""));
		min_idx.on("blur", this.clean_numeric_field.bind(this, min_idx, "min"));
		max_idx.on("blur", this.clean_numeric_field.bind(this, max_idx, "max"));

		min_idx.hide();
		max_idx.hide();
		select_dst.hide();

		this.DOM.down('.'+this.rootCSS+'-upload-global-action-select').on("change", this.change_global_action.bind(this));
		// batch controls setup end

		// Send a json query to obtain the list of uploaded files
		this.getUploadedFiles();
	}
});
