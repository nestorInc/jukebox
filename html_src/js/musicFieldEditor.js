/* jshint nonstandard: true, loopfunc: true, sub: true */
/* global genresOrdered, Event, TableKit, $ */

function MusicFieldEditor(name, rootCSS, uploadedFiles, uploadedFilesEdition)
{
	this.name = name;
	this.rootCSS = rootCSS;
	this.prefix = rootCSS + '-upload-';
	this.uploadedFiles = uploadedFiles;
	this.uploadedFilesEdition = uploadedFilesEdition;
}

MusicFieldEditor.prototype._cancel = function(e)
{
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.cancel(cell);
};
MusicFieldEditor.prototype.cancel = function(cell)
{
	var data = TableKit.getCellData(cell);
	cell.innerHTML = data.htmlContent;
	data.htmlContent = '';
	data.active = false;
};

MusicFieldEditor.prototype._undo = function(e)
{
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.undo(cell);
};
MusicFieldEditor.prototype.undo = function(cell)
{
	var row = cell.up('tr'),
		identifier = row.id;

	for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
	{
		var uploadedFile = this.uploadedFiles[i],
			fname = escape(uploadedFile.filename);
		if(this.prefix + "line-" + fname == identifier)
		{
			var property = this.name.substring(this.prefix.length);
			if(row.select('.'+this.rootCSS+'-uploaded-file-modified').length == 1)
			{
				row.select('.'+this.rootCSS+'-uploaded-file-update').each(function(e){e.hide();});
				row.select('.'+this.rootCSS+'-uploaded-file-validate').each(function(e){e.show();});
			}
			if(this.name == this.prefix + "track")
			{
				cell.update(uploadedFile["track"].toString().split('/')[0]);
			}
			else if (this.name == this.prefix + "trackNb")
			{
				cell.update(uploadedFile["track"].toString().split('/')[1]);
			}
			else
			{
				cell.update(uploadedFile[property]);
			}
			this.uploadedFilesEdition[i][property] = this.uploadedFiles[i][property];
			break;
		}
	}

	// Remove cell style modified
	cell.removeClassName(this.rootCSS+'-uploaded-file-modified');

	var data = TableKit.getCellData(cell);
	data.active = false;
};

MusicFieldEditor.prototype._submit = function(e)
{
	var cell = Event.findElement(e, 'td');
	var form = Event.findElement(e, 'form');
	Event.stop(e);
	this.submit(cell, form);
};

MusicFieldEditor.prototype.submit = function(cell, form)
{
	form = form ? form : cell.down('form');

	var row = cell.up('tr'),
		identifier = row.id,
		firstChild = form.firstChild,
		firstChildVal = firstChild.value,
		property = this.name.substring(this.prefix.length);

	if(property == "genre" && genres[firstChildVal])
	{
		cell.update(genres[firstChildVal]);
	}
	else
	{
		cell.update(firstChildVal);
	}

	for(var i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
	{
		var fileE = this.uploadedFilesEdition[i],
			fname = escape(fileE.filename);
		if(this.prefix + "line-" + fname == identifier)
		{
			if(property == "genre")
			{
				fileE["genre"] = firstChild.options[firstChild.selectedIndex].value;
			}
			else if(property == "track")
			{
				if(fileE["track"].toString().indexOf("/") == -1)
				{
					fileE["track"] = firstChildVal + "/0";
				}
				else
				{
					fileE["track"] = firstChildVal + "/" + fileE["track"].split("/")[1];
				}
			}
			else if(property == "trackNb")
			{
				if(fileE["track"].toString().indexOf("/") == -1)
				{
					fileE["track"] = fileE["track"] + "/" + firstChildVal;
				}
				else
				{
					fileE["track"] = fileE["track"].toString().split('/')[0] + "/" + firstChildVal;
				}
			}
			else
			{
				fileE[property] = firstChildVal;
			}

			// Upload cell style ff the new value differs
			var isModified = false;
			if(!cell.hasClassName(this.rootCSS+'-uploaded-file-modified'))
			{
				if(property == "track" || property == "trackNb")
				{
					var track = this.uploadedFiles[i]["track"] || "",
						trackSplit = track.toString().split('/');

					if(property == "track")
					{
						isModified = trackSplit[0] !== firstChildVal;
					}
					else if(property == "trackNb")
					{
						isModified = trackSplit[1] !== firstChildVal;
					}
				}
				else
				{
					isModified = firstChildVal !== this.uploadedFiles[i][property];
				}
			}

			if(isModified)
			{
				// Default behaviour
				cell.addClassName(this.rootCSS+'-uploaded-file-modified');

				row.select('.'+this.rootCSS+'-uploaded-file-update').each(function(e){e.show();});
				row.select('.'+this.rootCSS+'-uploaded-file-validate').each(function(e){e.hide();});

			}

			if(firstChildVal == this.uploadedFiles[i][property] &&
				cell.hasClassName(this.rootCSS+'-uploaded-file-modified'))
			{
				cell.removeClassName(this.rootCSS+'-uploaded-file-modified');
			}


			break;
		}
	}

	var data = TableKit.getCellData(cell);
	data.active = false;
};

MusicFieldEditor.prototype.edit = function(cell)
{
	cell = $(cell);
	if(cell.hasClassName(this.rootCSS + "-upload-cell-static"))
	{
		return;
	}

	var table = cell.up('table'),
		row = cell.up('tr'),
		identifier = row.id,
		len,
		i;

	// Change behaviour following the column name
	var form = $(document.createElement("form"));
	form.id = cell.id + '-form';
	form.addClassName(TableKit.option('formClassName', table.id)[0]);
	form.onsubmit = this._submit.bindAsEventListener(this);

	// Change behavior from field names
	var modified = false;

	var property = this.name.substring(this.prefix.length);
	if(property == "genre")
	{
		// Create genre element add fill options
		var select = document.createElement("select");
		for(i = 0, len = genresOrdered.length; i < len; ++i)
		{
			var genre = genresOrdered[i],
				option = document.createElement('option');
			option.value = genre.id;
			option.appendChild(document.createTextNode(genre.name));
			select.appendChild(option);
		}
		form.appendChild(select);

		for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			if(this.prefix + "line-" + escape(this.uploadedFilesEdition[i].filename) == identifier)
			{
				if(this.uploadedFilesEdition[i]["genre"] != this.uploadedFiles[i]["genre"])
				{
					modified = true;
				}

				// Automatically select genre
				var options = select.select('option'),
					len2 = options.length;
				if(len2 > 0 && len2 < this.uploadedFilesEdition[i]["genre"])
				{
					options[len2-1].selected = true;
				}
				for(var j = 0; j < len2; j++)
				{
					if(options[j].value === this.uploadedFilesEdition[i]["genre"])
					{
						options[j].selected = true;
						break;
					}
				}

				break;
			}
		}
	}
	else
	{
		var input = document.createElement("input");
		input.type = "text";

		// Update new value
		for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			var fileE = this.uploadedFilesEdition[i];
			if(this.prefix + "line-" + escape(fileE.filename) == identifier)
			{
				if(property == "track")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = fileE["track"];
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[0];
						if(fileE["track"].toString().split('/')[1] !== this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else if(property == "trackNb")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = "0";
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[1];
						if(fileE["track"].toString().split('/')[1] !== this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else
				{
					input.value = fileE[property];
					if(fileE[property] !== this.uploadedFiles[i][property])
					{
						modified = true;
					}
				}

				break;
			}
		}
		form.appendChild(input);
	}

	var okButton = document.createElement("input");
	okButton.type = "submit";
	okButton.value = "submit";
	okButton.className = this.prefix + 'editor-ok';
	form.appendChild(okButton);

	if(modified)
	{
		var undoLink = document.createElement("a");
		undoLink.href = "javascript:;";
		undoLink.appendChild(document.createTextNode("undo "));
		undoLink.onclick = this._undo.bindAsEventListener(this);
		undoLink.className = this.prefix + 'editor-undo';
		form.appendChild(undoLink);
		form.appendChild(document.createTextNode(" "));
	}

	var cancelLink = document.createElement("a");
	cancelLink.href = "javascript:;";
	cancelLink.appendChild(document.createTextNode("cancel"));
	cancelLink.onclick = this._cancel.bindAsEventListener(this);
	cancelLink.className = this.prefix + 'editor-cancel';
	form.appendChild(cancelLink);

	cell.innerHTML = '';
	cell.appendChild(form);
};
