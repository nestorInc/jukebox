this.UploadTab = Class.create(Tab,
{
	initialize: function(tabName, DOM, rootCSS, jukebox, template)
	{
		this.name = tabName;
		this.uploader = null;
		this.uploadedFiles = null;
		this.uploadedFilesEdition = null;
		this.lastSendingDeletionIdentifier = null;
		this.lastSendingUpdateIdentifier = null;
		this.lastSendingValidationIdentifier = null;
		this.refresher = null;
		this.tableId = new Date().getTime();
		this.DOM = DOM;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
	},

	deleteUploadedSong: function(file_name)
	{
		if(this.lastSendingDeletionIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingDeletionIdentifier = fname;
			this.jukebox.deleteUploadedFile(fname);
		}
		else
		{
			Notifications.Display(3, "Please retry after the following song has been deleted: " + this.lastSendingDeletionIdentifier);
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
		else
		{
			Notifications.Display(3, "Please retry after the following song has been updated: " + this.lastSendingUpdateIdentifier);
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
		else
		{
			Notifications.Display(3, "Please retry after the following song has been validated: " + this.lastSendingValidationIdentifier);
		}
	},

	deletionResponse: function(ret, message)
	{
		var id = this.lastSendingDeletionIdentifier;

		// Wether success or error, reset the last sending identifier to allow a new deletion
		this.lastSendingDeletionIdentifier = null;

		if(ret == "success")
		{
			if(id !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == id)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				var $uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files');
				$uploaded_files.down('[id="' + this.rootCSS + '-upload-line-' + escape(id) + '"]').remove();
				Notifications.Display(2, "Song " + id + " sucessfully deleted");

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
	},

	updateResponse: function(ret, message)
	{
		if(ret == "success")
		{
			Notifications.Display(1, message);

			var lastId = escape(this.lastSendingUpdateIdentifier),
				rootCSS = this.rootCSS,
				$uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files'),
				$selector = $uploaded_files.down('[id="' + this.rootCSS + '-upload-line-' + lastId + '"]');

			// Delete all modified styles
			$selector.select('.'+rootCSS+'-uploaded-file-modified').each(function(e)
			{
				e.removeClassName(rootCSS+'-uploaded-file-modified');
			});

			// Hide update
			$selector.select('.'+rootCSS+'-uploaded-file-update').each(function(e)
			{
				e.hide();
			});

			// Show validate
			$selector.select('.'+rootCSS+'-uploaded-file-validate').each(function(e)
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
		var id = this.lastSendingValidationIdentifier;

		// Wether success or error, reset the last sending identifier to allow a new validation
		this.lastSendingValidationIdentifier = null;

		if(ret == "success")
		{
			Notifications.Display(1, message);
			if(id !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == id)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				var $uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files');
				$uploaded_files.down('[id="' + this.rootCSS + '-upload-line-' + escape(id) + '"]').remove();

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
	},

	reinitTable: function()
	{
		var $uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files');
		if($uploaded_files.down('tbody').childElementCount === 0)
		{
			$uploaded_files.update("No file uploaded yet.");
			this.uploadedFilesEdition = null;
			this.uploadedFiles = null;
		}
		else
		{
			var temp = new Date().getTime();
			$uploaded_files.down('[id="' + this.rootCSS + '-uploaded-filelist-' + this.tableId + '"]').id = this.rootCSS + '-uploaded-filelist-' + temp;
			this.tableId = temp;
			this.tableKit = new TableKit(this.rootCSS + '-uploaded-filelist-' + this.tableId,
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

	addRow: function(obj, tbody)
	{
		// Prepare variables
		var trackSlashIndex = obj.track.toString().indexOf("/"),
			track,
			trackNb;
		if(trackSlashIndex != -1)
		{
			track = obj.track.split("/")[0];
			trackNb = obj.track.split("/")[1];
		}
		else
		{
			track = obj.track;
			trackNb = 0;
		}

		var genre = genres[obj.genre] ? genres[obj.genre] : '',
			fname = escape(obj.filename);
		
		// Instanciate template
		var tableBodyTpl = new Template(this.template.tableBody),
			tableBodyVars =
			{
				root: this.rootCSS,
				rowId: this.rootCSS + '-upload-line-' + fname,
				filename: obj.filename,
				artist: obj.artist,
				album: obj.album,
				title: obj.title,
				year: obj.year,
				track: track,
				trackNb: trackNb,
				genre: genre
			},
			tr = tableBodyTpl.evaluate(tableBodyVars); // as a string

		// Compute a dom element
		tbody.insert(tr);
		tr = tbody.childElements().last();

		var divs = tr.select('div'),
			that = this;
		
		// Register listeners
		divs[0].on("click", function(){that.deleteUploadedSong(fname);});
		divs[1].on("click", function(){that.updateUploadedSong(fname);});
		divs[2].on("click", function(){that.validateUploadedSong(fname);});
	},

	displayUploadedFiles: function(uploaded_files)
	{
		var i, j,
			len,
			found,
			$uploaded_files = this.DOM.down('.'+this.rootCSS+'-uploaded-files'),
			$uploaded_files_tbody = $uploaded_files.down('tbody'),
			that = this;

		// Check for new files in 5 seconds
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

				var html = '<table id="' + this.rootCSS + '-uploaded-filelist-' + this.tableId + '" class="' + this.rootCSS + '-upload-table">';
				var tableHeadTpl = new Template(this.template.tableHead),
					tableHeadTplVars = {root: this.rootCSS},
					tr = tableHeadTpl.evaluate(tableHeadTplVars);
				html += '<thead>' + tr + '</thead><tfoot>' + tr + '</tfoot></table>';
				$uploaded_files.update(html);

				// Construct <tbody>
				var tbody = new Element('tbody');
				for(i = 0; i < uploaded_files.length; ++i)
				{
					this.addRow(uploaded_files[i], tbody);
					this.removeFileFromQQUpload(uploaded_files[i].filename);
				}
				$uploaded_files.down('table').insert(tbody);

				this.makeCellEditable(this.rootCSS + "-upload-artist");
				this.makeCellEditable(this.rootCSS + "-upload-album");
				this.makeCellEditable(this.rootCSS + "-upload-title");
				this.makeCellEditable(this.rootCSS + "-upload-year");
				this.makeCellEditable(this.rootCSS + "-upload-track");
				this.makeCellEditable(this.rootCSS + "-upload-trackNb");
				this.makeCellEditable(this.rootCSS + "-upload-genre");

				this.tableKit = new TableKit(this.rootCSS + '-uploaded-filelist-' + this.tableId,
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
				$uploaded_files.down('[id="' + this.rootCSS + '-upload-line-' + escape(deleteLines[i]) + '"]').remove();
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
				var tbody2 = $uploaded_files.down('[id="' + this.rootCSS + '-uploaded-filelist-' + this.tableId + '"]').down('tbody');
				this.addRow(newLines[i], tbody2);

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
		var uploadTpl = new Template(this.template.main),
			uploadTplVars =
			{
				root: this.rootCSS,
				uploadedFilesLabel: "Uploaded files"
			},
			upload_form = uploadTpl.evaluate(uploadTplVars);

		this.DOM = this.DOM.down('.'+this.rootCSS+'-tabContent-' + this.identifier);
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
			debug: true
		});

		// Send a json query to obtain the list off uploaded files
		this.getUploadedFiles();
	}
});
