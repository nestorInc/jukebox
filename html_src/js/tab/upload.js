var UploadTab = Class.create(Tab,
{
	initialize: function(identifier, tabName, jukebox)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.uploader = null;
		this.unique = "UploadTab";
		this.uploadedFiles = null;
		this.uploadedFilesEdition = null;
		this.lastSendingDeletionIdentifier = null;
		this.lastSendingUpdateIdentifier = null;
		this.lastSendingValidationIdentifier = null;
		this.refresher = null;
		this.tableId = new Date().getTime();
		this.jukebox = jukebox;
	},

	deleteUploadedSong: function(file_name)
	{
		if(this.lastSendingDeletionIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingDeletionIdentifier = fname;
			this.jukebox.deleteUploadedFile(fname);
		}
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

	updateUploadedSong: function(file_name)
	{
		if(this.lastSendingUpdateIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingUpdateIdentifier = fname;
			var tmp = this.getUploadedFileEditionFromFilename(fname);
			var opts =
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
	},

	validateUploadedSong: function(file_name)
	{
		if(this.lastSendingValidationIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingValidationIdentifier = fname;
			this.jukebox.validateUploadedFile(fname);
		}
	},

	deletionResponse: function(ret, message)
	{
		if(ret == "success")
		{
			if(this.lastSendingDeletionIdentifier !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == this.lastSendingDeletionIdentifier)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				$('upload_line_' + escape(this.lastSendingDeletionIdentifier)).remove();
				Notifications.Display(2, "Song " + this.lastSendingDeletionIdentifier + " sucessfully deleted");

				this.lastSendingDeletionIdentifier = null;

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			this.lastSendingDeletionIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	updateResponse: function(ret, message)
	{
		if(ret == "success")
		{
			Notifications.Display(1, message);

			var lastId = escape(this.lastSendingUpdateIdentifier),
				selector = 'upload_line_' + lastId,
				$selector = $(selector);

			// Delete all modified styles
			$selector.select('[class="modified"]').each(function(e)
			{
				e.removeClassName("modified");
			});

			// Hide update
			$selector.select('[class="update"]').each(function(e)
			{
				e.hide();
			});

			// Show validate
			$selector.select('[class="validate"]').each(function(e)
			{
				e.show();
			});
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
		this.lastSendingUpdateIdentifier = null;
	},

	validationResponse: function(ret, message)
	{
		if(ret == "success")
		{
			Notifications.Display(1, message);
			if(this.lastSendingValidationIdentifier !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == this.lastSendingValidationIdentifier)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				$('upload_line_' + escape(this.lastSendingValidationIdentifier)).remove();

				this.lastSendingValidationIdentifier = null;

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			this.lastSendingValidationIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	reinitTable: function()
	{
		var $uploaded_files = $('uploaded_files');
		if($uploaded_files.down('tbody').childElementCount === 0)
		{
			$uploaded_files.update("No file uploaded yet.");
			this.uploadedFilesEdition = null;
			this.uploadedFiles = null;
		}
		else
		{
			var temp = new Date().getTime();
			$('uploaded_filelist_' + this.tableId).id = 'uploaded_filelist_' + temp;
			this.tableId = temp;
			this.tableKit = new TableKit('uploaded_filelist_' + this.tableId,
			{
				'sortable': true,
				'editable': true,
				'trueResize': true,
				'keepWidth': true
			});
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

	getUploadedFileHtml: function(obj)
	{
		var html = '<td class="static">' + obj.filename + '</td><td>';
		if(obj.artist) {html += obj.artist;}
		html += '</td><td>';
		if(obj.album) {html += obj.album;}
		html += '</td><td>';
		if(obj.title) {html += obj.title;}
		html += '</td><td>' + obj.year + '</td><td>';

		var trackSlashIndex = obj.track.toString().indexOf("/");
		if(trackSlashIndex != -1) {html += obj.track.split("/")[0];}
		else {html += obj.track;}
		html += '</td><td>';
		if(trackSlashIndex != -1) {html += obj.track.split("/")[1];}
		else {html += 0;}
		html += '</td><td>';
		if(genres[obj.genre])
		{
			html += genres[obj.genre];
		}
		html += '</td>' +
		'<td class="static actions">' +
			'<div>' +
				'<a href="javascript:void(0);">X</a>' +
			'</div>' +
			
			'<div class="update" style="display:none;">' +
				'<a href="javascript:void(0);">&nbsp;Update&nbsp;</a>' +
			'</div>' +

			'<div class="validate">' +
				'<a href="javascript:void(0);">&nbsp;Validate&nbsp;</a>' +
			'</div>' +
		'</td>';

		var fname = escape(obj.filename),
			tr = new Element('tr', {'id': 'upload_line_' + fname}).update(html),
			divs = tr.select('div'),
			that = this;
		
		divs[0].on("click", function(){that.deleteUploadedSong(fname);});
		divs[1].on("click", function(){that.updateUploadedSong(fname);});
		divs[2].on("click", function(){that.validateUploadedSong(fname);});

		return tr;
	},

	displayUploadedFiles: function(uploaded_files)
	{
		var i, j,
			len,
			found,
			$uploaded_files = $('uploaded_files'),
			$uploaded_files_tbody = $uploaded_files.down('tbody'),
			that = this;

		// Check for new files every 5 seconds
		clearTimeout(this.refresher);
		this.refresher = setTimeout(function()
		{
			that.getUploadedFiles();
		}, 5000);

		/*TODO:
		The following code doesn't work in a multi-users scenario where users upload/delete/validate files at the same time
		For example, the case this.uploadedFiles.length == uploaded_files.length but with different files is not handle
		=> recreate the whole table each time? Recheck all items to delete/add ?
		*/

		// Insertion when there was no item in the array in the previous state
		if(this.uploadedFiles === null /*|| this.uploadedFilesEdition == null*/ ||
			(
				$uploaded_files_tbody === null ||
				$uploaded_files_tbody.childElementCount === 0 && uploaded_files.length > 0
			)
		)
		{
			if(uploaded_files.length > 0)
			{
				// trick used to clone ; TODO: replace with Extend
				this.uploadedFiles = JSON.parse(JSON.stringify(uploaded_files));
				this.uploadedFilesEdition = JSON.parse(JSON.stringify(uploaded_files));

				var html = '<table id="uploaded_filelist_' + this.tableId + '" class="sortable resizable editable upload_table">';
				var tr = '<tr>' +
					'<th>Filename</th>' +
					'<th class="artist">Artist</th>' +
					'<th class="album">Album</th>' +
					'<th class="title">Title</th>' +
					'<th class="year">Year</th>' +
					'<th class="track">Track</th>' +
					'<th class="trackNb">TrackNb</th>' +
					'<th class="genre">Genre</th>' +
					'<th>Actions</th>' +
				'</tr>';
				html += '<thead>' + tr + '</thead><tfoot>' + tr + '</tfoot></table>';
				$uploaded_files.update(html);

				// Construct <tbody>
				var tbody = new Element('tbody');
				for(i = 0; i < uploaded_files.length; ++i)
				{
					tbody.insert(this.getUploadedFileHtml(uploaded_files[i]));
					this.removeFileFromQQUpload(uploaded_files[i].filename);
				}
				$uploaded_files.down('table').insert(tbody);

				this.makeCellEditable("artist");
				this.makeCellEditable("album");
				this.makeCellEditable("title");
				this.makeCellEditable("year");
				this.makeCellEditable("track");
				this.makeCellEditable("trackNb");
				this.makeCellEditable("genre");

				this.tableKit = new TableKit('uploaded_filelist_' + this.tableId,
				{
					'sortable': true,
					'editable': true,
					'trueResize': true,
					'keepWidth': true
				});
			}
			else // uploaded_files.length == 0
			{
				// The array is empty and nothing to insert
				$uploaded_files.update("No file uploaded yet.");
			}
		}
		else if(this.uploadedFiles.length > uploaded_files.length)
		{
			// Find files to delete
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

			// Deletes unneeded references
			for(i = 0; i < deleteLines.length; ++i)
			{
				// Delete unmodified reference entry
				for(j = 0, len = this.uploadedFiles.length; j < len; ++j)
				{
					if(this.uploadedFiles[i].filename == deleteLines[i].filename)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Remove the html Element
				$('upload_line_' + escape(deleteLines[i])).remove();
			}
		}
		else if(this.uploadedFiles.length < uploaded_files.length)
		{
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
				this.uploadedFiles.push(JSON.parse(JSON.stringify(newLines[i])));
				this.uploadedFilesEdition.push(JSON.parse(JSON.stringify(newLines[i])));
				$('uploaded_filelist_' + this.tableId).down('tbody').insert(this.getUploadedFileHtml(newLines[i]));

				this.removeFileFromQQUpload(newLines[i].filename);
			}

			if(this.uploadedFiles.length !== 0 && newLines.length > 0)
			{
				this.reinitTable();
			}
		}
	},

	makeCellEditable: function(name)
	{
		var obj = new MusicFieldEditor(name, this.uploadedFiles, this.uploadedFilesEdition);
		TableKit.Editable.addCellEditor(obj);
	},

	removeFileFromQQUpload: function(filename)
	{
		$$('.qq-upload-success').each(function(element)
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
		this.jukebox.getUploadedFiles();
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

	updateContent: function()
	{
		var upload_form = '<div id="file-uploader' + this.identifier + '"></div>' +
			'<h2>Uploaded files</h2>' +
			'<div id="uploaded_files" style="overflow:auto;"></div>';

		$('tabContent_' + this.identifier).update(upload_form);

		// Init upload button behavior
		this.uploader = new qq.FileUploader(
		{
			element: document.getElementById('file-uploader' + this.identifier),
			action: 'upload',
			params:
			{
				id: this.identifier
			},
			debug: true
		});

		// Send a json query to obtain the list off uploaded files
		this.getUploadedFiles();
	}
});
