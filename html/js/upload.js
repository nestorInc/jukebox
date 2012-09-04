var UploadTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		// Search parameters 
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
	},

	deleteUploadedSong: function(file_name)
	{
		if(this.lastSendingDeletionIdentifier == null)
		{
			this.lastSendingDeletionIdentifier = unescape(file_name);
			query = {};
			query.action =
			{
				name: "delete_uploaded_file",
				file_name: unescape(file_name)
			};
			updateJukebox();
		}
	},

	getUploadedFileEditionFromFilename: function(file_name)
	{
		if(null == tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition)
		{
			return null;
		}
		for(var i = 0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length; ++i)
		{
			if(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename == file_name)
			{
				return tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i];
			}
		}
		return null;
	},

	updateUploadedSong: function(file_name)
	{
		if(this.lastSendingUpdateIdentifier == null)
		{
			this.lastSendingUpdateIdentifier = unescape(file_name);
			var tmp = this.getUploadedFileEditionFromFilename(unescape(file_name));
			query = {};
			query.action =
			{
				name: "update_uploaded_file",
				file_name: unescape(file_name),
				title: tmp.title,
				album: tmp.album,
				artist: tmp.artist,
				year: tmp.year,
				track: tmp.track,
				genre: tmp.genre
			};
			updateJukebox();
		}
	},

	validateUploadedSong: function(file_name)
	{
		if(this.lastSendingValidationIdentifier == null)
		{
			this.lastSendingValidationIdentifier = unescape(file_name);
			query = {};
			query.action =
			{
				name: "validate_uploaded_file",
				file_name: unescape(file_name)
			};
			updateJukebox();
		}
	},

	deletionResponse: function(ret, message)
	{
		if("success" == ret)
		{
			if(null != this.lastSendingDeletionIdentifier)
			{
				// Delete html part
				$('upload_line_' + escape(this.lastSendingDeletionIdentifier)).remove();
				Notifications.Display(2, "song '" + this.lastSendingDeletionIdentifier + "'sucessfully deleted");

				// Delete unmodified reference entry
				var newUploaddedFilelist = [];
				var i = this.uploadedFiles.length - 1;
				while(i >= 0)
				{
					if(this.uploadedFiles[i].filename != this.lastSendingDeletionIdentifier)
					{
						this.uploadedFiles.splice(i, 1);
						newUploaddedFilelist.push(this.uploadedFiles[i]);
					}
					i = i - 1;
				}
				this.uploadedFiles = newUploaddedFilelist;

				// Delete modifications file entry
				newUploaddedFilelist = [];
				var j = this.uploadedFilesEdition.length - 1;
				while(j >= 0)
				{
					if(this.uploadedFilesEdition[j].filename != this.lastSendingDeletionIdentifier)
					{
						newUploaddedFilelist.push(this.uploadedFilesEdition[j]);
					}
					j = j - 1;
				}
				this.uploadedFilesEdition = newUploaddedFilelist;
				this.lastSendingDeletionIdentifier = null;
				if(0 == $('uploaded_files').down('tbody').childElementCount)
				{
					var html_uploaded_files = "No file uploaded yet.";
					$('uploaded_files').update(html_uploaded_files);
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
			}
		}
		else if("error" == ret)
		{
			this.lastSendingDeletionIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	updateResponse: function(ret, message)
	{
		if("success" == ret)
		{
			Notifications.Display(1, message);

			// Delete all modified styles
			$('upload_line_' + escape(this.lastSendingUpdateIdentifier)).select('[class="modified"]').each(function(e)
			{
				e.removeClassName("modified");
			});

			// Hide update
			$('upload_line_' + escape(this.lastSendingUpdateIdentifier)).select('[name="update"]').each(function(e)
			{
				e.hide();
			});

			// Show validate
			$('upload_line_' + escape(this.lastSendingUpdateIdentifier)).select('[name="validate"]').each(function(e)
			{
				e.show();
			});
		}
		else if("error" == ret)
		{
			Notifications.Display(4, message);
		}
		this.lastSendingUpdateIdentifier = null;
	},

	validationResponse: function(ret, message)
	{
		if("success" == ret)
		{
			Notifications.Display(1, message);
			if(null != this.lastSendingValidationIdentifier)
			{
				// Delete html part
				$('upload_line_' + escape(this.lastSendingValidationIdentifier)).remove();

				// Delete unmodified reference entry
				var newUploaddedFilelist = [];
				var i = this.uploadedFiles.length - 1;
				while(i >= 0)
				{
					if(this.uploadedFiles[i].filename != this.lastSendingValidationIdentifier)
					{
						newUploaddedFilelist.push(this.uploadedFiles[i]);
					}
					i = i - 1;
				}
				this.uploadedFiles = newUploaddedFilelist;

				// Delete modifications file entry
				newUploaddedFilelist = [];
				var j = this.uploadedFilesEdition.length - 1;
				while(j >= 0)
				{
					if(this.uploadedFilesEdition[j].filename != this.lastSendingValidationIdentifier)
					{
						newUploaddedFilelist.push(this.uploadedFilesEdition[j]);
					}
					j = j - 1;
				}
				this.uploadedFilesEdition = newUploaddedFilelist;
				this.lastSendingValidationIdentifier = null;

				if($('uploaded_files').down('tbody').childElementCount == 0)
				{
					var html_uploaded_files = "No file uploaded yet.";
					$('uploaded_files').update(html_uploaded_files);
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
			}
		}
		else if("error" == ret)
		{
			this.lastSendingValidationIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	treatResponse: function(resp)
	{
		// Switch case show/deletion/update/alidation
		if(undefined != resp.action_response && null != resp.action_response)
		{
			if("validate_uploaded_file" == resp.action_response.name)
			{
				this.validationResponse(resp.action_response["return"], resp.action_response["message"]);
			}
			else if("delete_uploaded_file" == resp.action_response.name)
			{
				this.deletionResponse(resp.action_response["return"], resp.action_response["message"]);
			}
			else if("update_uploaded_file" == resp.action_response.name)
			{
				this.updateResponse(resp.action_response["return"], resp.action_response["message"]);
			}
		}

		if(undefined != resp.files && null != resp.files)
		{
			this.displayUploadedFiles(resp.files);
		}
	},

	getUploadedFileHtml: function(obj)
	{
		var html_uploaded_files = '' +
		'<tr id="upload_line_' + escape(obj.filename) + '">' +
		'<td class="static">' + obj.filename + '</td>' +
		'<td>';
		if(obj.artist) {html_uploaded_files += obj.artist;}
		html_uploaded_files += '</td><td>';
		if(obj.album) {html_uploaded_files += obj.album;}
		html_uploaded_files += '</td><td>';
		if(obj.title) {html_uploaded_files += obj.title;}
		html_uploaded_files += '</td><td>' + obj.year + '</td><td>';
		if(obj.track.toString().indexOf("/") != -1) {html_uploaded_files += obj.track.split("/")[0];}
		else {html_uploaded_files += obj.track;}
		html_uploaded_files += '</td><td>';
		if(obj.track.toString().indexOf("/") != -1) {html_uploaded_files += obj.track.split("/")[1];}
		else {html_uploaded_files += 0;}
		html_uploaded_files += '</td><td>';
		if(genres.length >= obj.genre)
		{
			for(var i = 0; i < genres.length; ++i)
			{
				if(genres[i][1] == obj.genre)
				{
					html_uploaded_files += genres[i][0];
					break;
				}
			}
		}
		else
		{
			html_uploaded_files += genres[genres.length - 1][0];
		}
		html_uploaded_files += '</td>' +
		'<td class="static actions">' +
			'<div name="delete">' +
				'<a href="javascript:void(0);" onclick="tabs.getFirstTabByClassName("UploadTab").deleteUploadedSong("' + escape(obj.filename) + '");return false;">X</a>' +
			'</div>' +
			
			'<div name="update" style="display:none;">' +
				'<a href="javascript:void(0);" onclick="tabs.getFirstTabByClassName("UploadTab").updateUploadedSong("' + escape(obj.filename) + '");return false;">&nbsp;Update&nbsp;</a>' +
			'</div>' +

			'<div name="validate">' +
				'<a href="javascript:void(0);" onclick="tabs.getFirstTabByClassName("UploadTab").validateUploadedSong("' + escape(obj.filename) + '");return false;">&nbsp;Validate&nbsp;</a>' +
			'</div>' +
		'</td>' +
		'</tr>';
		return html_uploaded_files;
	},

	displayUploadedFiles: function(uploaded_files)
	{
		var i, j,
			found,
			newLines = [],
			html_uploaded_files = '';

		clearTimeout(this.refresher);
		this.refresher = setTimeout("tabs.getFirstTabByClassName(\"UploadTab\").getUploadedFiles();", 5000);

		// Insertion when there was no item in the array in the previous state
		if(null == this.uploadedFiles || null == this.uploadedFilesEdition || 
			(
				$('uploaded_files').down('tbody') == null || 
				$('uploaded_files').down('tbody').childElementCount == 0
				&& uploaded_files.length >= 1
			)
		)
		{
			if(uploaded_files.length >= 1)
			{
				html_uploaded_files += '<table id="uploaded_filelist_' + this.tableId + '" class="sortable resizable editable">' +
				'<thead><tr>' +
					'<th id="filename">Filename</th>' +
					'<th id="artist">Artist</th>' +
					'<th id="album">Album</th>' +
					'<th id="title">Title</th>' +
					'<th id="year">Year</th>' +
					'<th id="track">Track</th>' +
					'<th id="trackNb">TrackNb</th>' +
					'<th id="genre">Genre</th>' +
					'<th id="actions">Actions</th>' +
				'</tr></thead>' +
				'<tfoot><tr>' +
					'<td id="filename">Filename</td>' +
					'<td id="artist">Artist</td>' +
					'<td id="album">Album</td>' +
					'<td id="title">Title</td>' +
					'<td id="year">Year</td>' +
					'<td id="track">Track</td>' +
					'<td id="trackNb">TrackNb</td>' +
					'<td id="genre">Genre</td>' +
					'<td id="actions">Actions</td>' +
				'</tr></tfoot>';

				html_uploaded_files += '<tbody>';
				for(i = 0; i < uploaded_files.length; ++i)
				{
					html_uploaded_files += this.getUploadedFileHtml(uploaded_files[i]);
					$$('.qq-upload-success').each(function(element)
					{
						if(element.down('.qq-upload-file').innerHTML == uploaded_files[i].filename)
						{
							element.remove();
							Notifications.Display(1, 'Informations for : ' + uploaded_files[i].filename + 'successfuly retrieved.');
						}
					});
				}
				html_uploaded_files += '</tbody></table>';
				$('uploaded_files').update(html_uploaded_files);

				var obj = new MusicFieldEditor("artist");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("album");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("title");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("year");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("track");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("trackNb");
				TableKit.Editable.addCellEditor(obj);
				obj = new MusicFieldEditor("genre");
				TableKit.Editable.addCellEditor(obj);

				this.tableKit = new TableKit('uploaded_filelist_' + this.tableId,
				{
					'sortable': true,
					'editable': true,
					'trueResize': true,
					'keepWidth': true
				});
			}
			else
			{
				// The array is empty and nothing to insert
				html_uploaded_files = "No file uploaded yet.";
				$('uploaded_files').update(html_uploaded_files);
			}
		}
		else if($('uploaded_files').down('tbody').childElementCount > uploaded_files.length)
		{
			// Find files to delete
			newLines = [];
			for(j = 0; j < this.uploadedFiles.length; ++j)
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
					newLines.push(this.uploadedFiles[j].filename);
				}
			}

			// Deletes unneeded references
			for(i = 0; i < newLines.length; ++i)
			{
				// Remove the html Element
				$('upload_line_' + escape(newLines[i])).remove();

				// Delete unmodified reference entry
				var newUploadedFilelist = [];
				j = this.uploadedFiles.length - 1;
				while(j >= 0)
				{
					if(this.uploadedFiles[j].filename != newLines[i].filename)
					{
						newUploadedFilelist.push(this.uploadedFiles[j]);
					}
					i = i - 1;
				}
				this.uploadedFiles = newUploaddedFilelist;

				newUploadedFilelist = [];
				j = this.uploadedFilesEdition.length - 1;
				while(j >= 0)
				{
					if(this.uploadedFilesEdition[j].filename != newLines[i].filename)
					{
						newUploadedFilelist.push(this.uploadedFilesEdition[j]);
					}
					i = i - 1;
				}
				this.uploadedFilesEdition = newUploaddedFilelist;
			}
		}
		else if($('uploaded_files').down('tbody').childElementCount < uploaded_files.length)
		{
			// Just insert the new file
			// Find files to add
			newLines = [];
			for(i = 0; i < uploaded_files.length; ++i)
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
			for(i = 0; i < newLines.length; ++i)
			{
				$('uploaded_filelist_' + this.tableId).down('tbody').insert(this.getUploadedFileHtml(newLines[i]));
				this.uploadedFiles.push(JSON.parse(JSON.stringify(newLines[i])));
				this.uploadedFilesEdition.push(JSON.parse(JSON.stringify(newLines[i])));
				$$('.qq-upload-success').each(function(element)
				{
					if(element.down('.qq-upload-file').innerHTML == newLines[i].filename)
					{
						element.remove();
						Notifications.Display(1, 'Informations for : ' + uploaded_files[i].filename + 'successfuly retrieved.');
					}
				});
			}

			if(this.uploadedFiles.length != 0 && newLines.length > 0)
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
		}
		if(null == this.uploadedFiles || this.uploadedFiles.length == 0)
		{
			// trick used to clone
			this.uploadedFiles = JSON.parse(JSON.stringify(uploaded_files));
		}
		if(null == this.uploadedFilesEdition || this.uploadedFilesEdition.length == 0)
		{
			this.uploadedFilesEdition = JSON.parse(JSON.stringify(uploaded_files));
		}
	},

	getUploadedFiles: function()
	{
		query = {};
		query.action = {};
		query.action.name = "get_uploaded_files";
		updateJukebox();
	},

	clear: function()
	{
		clearTimeout(this.refresher); // Don't know if it works
		if(tabs.getFirstTabByClassName("UploadTab").uploader._handler._queue.length > 0)
		{
			Notifications.Display(1, "All current uploads canceled.");
		}
		tabs.getFirstTabByClassName("UploadTab").uploader._handler.cancelAll();

		this.refresher = null;
	},

	updateContent: function()
	{
		var upload_form = '' +
		'<div id="file-uploader' + this.identifier + '">' +
			'<div class="qq-uploader">' +
				'<div class="qq-upload-drop-area" style="display: none;">' +
					'<span>Drop files here to upload</span>' +
				'</div>' +
				'<div class="qq-upload-button" style="position: relative; overflow: hidden; direction: ltr;">' +
					'Upload files' +
					'<input type="file" multiple="multiple" name="file" style="position:absolute; right:0pt; top:0pt; font-family:Arial; font-size:118px; margin:0pt; padding:0pt; cursor:pointer; opacity:0;" />' +
				'</div>' +
				'<ul class="qq-upload-list"></ul>' +
			'</div>' +
		'</div>' +
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
