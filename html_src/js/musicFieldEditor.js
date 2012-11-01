function MusicFieldEditor(name, uploadedFiles, uploadedFilesEdition)
{
	this.name = name;
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
		identifier = row.id; // // Get the line filename ( identifier )

	// Update html
	for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
	{
		var fname = escape(this.uploadedFiles[i].filename);
		if("upload-line-" + fname == identifier)
		{
			// Show validate
			var selector = 'upload-line-' + fname,
				$selector = $(selector);
			if($selector.select('[class="modified"]').length == 1)
			{
				$selector.select('[class="update"]').each(function(e){e.hide();});
				$selector.select('[class="validate"]').each(function(e){e.show();});
			}
			if(this.name == "track")
			{
				cell.update(this.uploadedFiles[i]["track"].split('/')[0]);
			}
			else if (this.name == "trackNb")
			{
				cell.update(this.uploadedFiles[i]["track"].split('/')[1]);
			}
			else
			{
				cell.update(this.uploadedFiles[i][this.name]);
			}
			this.uploadedFilesEdition[i][this.name] = this.uploadedFiles[i][this.name];
			break;
		}
	}

	// Remove cell style modified
	cell.removeClassName("modified");

	var data = TableKit.getCellData(cell);
	data.active = false;
};

MusicFieldEditor.prototype._submit = function(e)
{
	var cell = Event.findElement(e,'td');
	var form = Event.findElement(e,'form');
	Event.stop(e);
	this.submit(cell,form);
};

MusicFieldEditor.prototype.submit = function(cell, form)
{
	form = form ? form : cell.down('form');

	var row = cell.up('tr'),
		identifier = row.id, // Get the line filename ( identifier )
		firstChild = form.firstChild,
		firstChildVal = firstChild.value;

	// Update html
	if(this.name == "genre" && genres[firstChildVal])
	{
		cell.update(genres[firstChildVal]);
	}
	else
	{
		cell.update(firstChildVal);
	}

	// Update new value
	for(var i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
	{
		var fileE = this.uploadedFilesEdition[i],
			fname = escape(fileE.filename);
		if("upload-line-" + fname == identifier)
		{
			if(this.name == "genre")
			{
				fileE[this.name] = firstChild.options[firstChild.selectedIndex].value;
			}
			else if(this.name == "track")
			{
				if(fileE[this.name].toString().indexOf("/") == -1)
				{
					fileE[this.name] = firstChildVal + "/0";
				}
				else
				{
					fileE[this.name] = firstChildVal + "/" + fileE[this.name].split("/")[1];
				}
			}
			else if(this.name == "trackNb")
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
				fileE[this.name] = firstChildVal;
			}

			// Upload cell style ff the new value differs
			if( (
					( this.name == "track" && this.uploadedFiles[i][this.name].split('/')[0] != firstChildVal ) ||
					( this.name == "trackNb" && this.uploadedFiles[i]["track"].split('/')[1] != firstChildVal ) ||
					( this.name != "track" && this.name != "trackNb" && firstChildVal != this.uploadedFiles[i][this.name] )
				) &&
				!cell.hasClassName("modified"))
			{
				// Default behaviour
				cell.addClassName("modified");

				var $selector = $('upload-line-' + fname);
				$selector.select('[class="update"]').each(function(e){e.show();});
				$selector.select('[class="validate"]').each(function(e){e.hide();});

			}
			else if(firstChildVal == this.uploadedFiles[i][this.name] && cell.hasClassName("modified"))
			{
				cell.removeClassName("modified");
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
	if(cell.hasClassName("static"))
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

	if(this.name == "genre")
	{
		// Create genre element add fill options
		var select = document.createElement("select");
		select.id = "genre";
		form.appendChild(select);

		for(i = 0, len = genresOrdered.length; i < len; ++i)
		{
			var genre = genresOrdered[i];
			var option = document.createElement('option');
			option.value = genre.id;
			option.appendChild(document.createTextNode(genre.name));
			select.appendChild(option);
		}

		for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			if("upload-line-" + escape(this.uploadedFilesEdition[i].filename) == identifier)
			{
				if(this.uploadedFilesEdition[i]["genre"] != this.uploadedFiles[i]["genre"])
				{
					modified = true;
				}
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
			if("upload-line-" + escape(fileE.filename) == identifier)
			{
				if(this.name == "track")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = fileE["track"];
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[0];
						if(fileE["track"].toString().split('/')[1] != this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else if(this.name == "trackNb")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = "0";
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[1];
						if(fileE["track"].toString().split('/')[1] != this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else
				{
					input.value = fileE[this.name];
					if(fileE[this.name] != this.uploadedFiles[i][this.name])
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
	okButton.className = 'editor-ok-button';
	form.appendChild(okButton);

	if(modified)
	{
		var undoLink = document.createElement("a");
		undoLink.href = "#";
		undoLink.appendChild(document.createTextNode("undo "));
		undoLink.onclick = this._undo.bindAsEventListener(this);
		undoLink.className = 'editor-undo';      
		form.appendChild(undoLink);
		form.appendChild(document.createTextNode(" "));
	}
	
	var cancelLink = document.createElement("a");
	cancelLink.href = "#";
	cancelLink.appendChild(document.createTextNode("cancel"));
	cancelLink.onclick = this._cancel.bindAsEventListener(this);
	cancelLink.className = 'editor-cancel';      
	form.appendChild(cancelLink);

	cell.innerHTML = '';
	cell.appendChild(form);

	// Update new value
	for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
	{
		if("upload-line-" + escape(this.uploadedFilesEdition[i].filename) == identifier)
		{
			// Automatically select genre
			var options = $$('select#genre option');
			var len2 = options.length;
			if(len2 > 0 && len2 < this.uploadedFilesEdition[i][this.name])
			{
				options[len2-1].selected = true;
			}
			for(var j = 0; j < len2; j++)
			{
				if(options[j].value == this.uploadedFilesEdition[i][this.name])
				{
					options[j].selected = true;
					break;
				}
			}
		}
	}
};
