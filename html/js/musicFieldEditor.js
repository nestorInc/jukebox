function MusicFieldEditor(name)
{
	this.name = name;
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
}
MusicFieldEditor.prototype.undo = function(cell)
{
	var row = cell.up('tr'),
		UploadTab = tabs.getFirstTabByClassName("UploadTab");

	// Get the line filename ( identifier )
	var identifier = row.id;

	// Update html
	for(var i = 0; i < UploadTab.uploadedFiles.length; ++i)
	{
		if("upload_line_" + escape(UploadTab.uploadedFiles[i].filename) == identifier)
		{
			// Show validate
			var selector = 'upload_line_' + escape(UploadTab.uploadedFilesEdition[i].filename),
				$selector = $(selector);
			if(1 == $selector.select('[class="modified"]').length)
			{
				$selector.select('[name="update"]').each(function(e){e.hide();});
				$selector.select('[name="validate"]').each(function(e){e.show();});
			}
			if(this.name == "track")
			{
				cell.update(UploadTab.uploadedFiles[i]["track"].split('/')[0]);
			}
			else if (this.name == "trackNb")
			{
				cell.update(UploadTab.uploadedFiles[i]["track"].split('/')[1]);
			}
			else
			{
				cell.update(UploadTab.uploadedFiles[i][this.name]);
			}
			UploadTab.uploadedFilesEdition[i][this.name] = UploadTab.uploadedFiles[i][this.name];
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
		UploadTab = tabs.getFirstTabByClassName("UploadTab");

	// Get the line filename ( identifier )
	var identifier = row.id,
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
	for(var i = 0; i < UploadTab.uploadedFilesEdition.length; ++i)
	{
		var fileE = UploadTab.uploadedFilesEdition[i];
		if("upload_line_" + escape(fileE.filename) == identifier)
		{
			if(this.name == "genre")
			{
				fileE[this.name] = firstChild.options[firstChild.selectedIndex].value;
			}
			else if(this.name == "track")
			{
				if(-1 == fileE[this.name].toString().indexOf("/"))
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
				if(-1 == fileE["track"].toString().indexOf("/"))
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
				( this.name == "track" && UploadTab.uploadedFiles[i][this.name].split('/')[0] != firstChildVal ) ||
				( this.name == "trackNb" && UploadTab.uploadedFiles[i]["track"].split('/')[1] != firstChildVal ) ||
				( this.name != "track" && this.name != "trackNb" && firstChildVal != UploadTab.uploadedFiles[i][this.name] )
				)
				&& !cell.hasClassName("modified"))
			{
				// Default behaviour
				cell.addClassName("modified");

				var $selector = $('upload_line_' + escape(fileE.filename));

				// Hide update
				$selector.select('[name="update"]').each(function(e){e.show();});

				// Show validate
				$selector.select('[name="validate"]').each(function(e){e.hide();});

			}
			else if(firstChildVal == UploadTab.uploadedFiles[i][this.name] && cell.hasClassName("modified"))
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
		UploadTab = tabs.getFirstTabByClassName("UploadTab"),
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

		/*TODO: copy _$.search_genres
		for(i = 0, len = genres.length; i < len; ++i)
		{
			var option = document.createElement("option");
			option.value = genres[i][1];
			option.appendChild(document.createTextNode(genres[i][0]));
			select.appendChild(option);
		}
		*/

		for(i = 0; i < UploadTab.uploadedFilesEdition.length; ++i)
		{
			if("upload_line_" + escape(UploadTab.uploadedFilesEdition[i].filename) == identifier)
			{
				if(UploadTab.uploadedFilesEdition[i]["genre"] != UploadTab.uploadedFiles[i]["genre"])
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
		for(i = 0; i < UploadTab.uploadedFilesEdition.length; ++i)
		{
			var fileE = UploadTab.uploadedFilesEdition[i];
			if("upload_line_" + escape(fileE.filename) == identifier)
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
						if(fileE["track"].toString().split('/')[1] != UploadTab.uploadedFiles[i]["track"].toString().split('/')[1])
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
						if(fileE["track"].toString().split('/')[1] != UploadTab.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else
				{
					input.value = fileE[this.name];
					if(fileE[this.name] != UploadTab.uploadedFiles[i][this.name])
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
	okButton.className = 'editor_ok_button';
	form.appendChild(okButton);

	if(modified)
	{
		var undoLink = document.createElement("a");
		undoLink.href = "#";
		undoLink.appendChild(document.createTextNode("undo"));
		undoLink.onclick = this._undo.bindAsEventListener(this);
		undoLink.className = 'editor_undo';      
		form.appendChild(undoLink);
	}
	
	var cancelLink = document.createElement("a");
	cancelLink.href = "#";
	cancelLink.appendChild(document.createTextNode("cancel"));
	cancelLink.onclick = this._cancel.bindAsEventListener(this);
	cancelLink.className = 'editor_cancel';      
	form.appendChild(cancelLink);

	cell.innerHTML = '';
	cell.appendChild(form);

	// Update new value
	for(i = 0; i < UploadTab.uploadedFilesEdition.length; ++i)
	{
		if("upload_line_" + escape(UploadTab.uploadedFilesEdition[i].filename) == identifier)
		{
			// Automatically select genre
			var options = $$('select#genre option');
			var len = options.length;
			if(len > 0 && len < UploadTab.uploadedFilesEdition[i][this.name])
			{
				options[len-1].selected = true;
			}
			for(var j = 0; j < len; j++)
			{
				if(options[j].value == UploadTab.uploadedFilesEdition[i][this.name])
				{
					options[j].selected = true;
					break;
				}
			}
		}
	}
};
