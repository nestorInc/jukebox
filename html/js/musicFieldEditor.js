musicFieldEditor = function(name ) {
    this.name = name;
}

musicFieldEditor.prototype._cancel = function(e) {
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.cancel(cell);
};
musicFieldEditor.prototype.cancel = function(cell) {
	var data = TableKit.getCellData(cell);
	cell.innerHTML = data.htmlContent;
	data.htmlContent = '';
	data.active = false;
};

musicFieldEditor.prototype._undo = function(e) {
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.undo(cell);
}
musicFieldEditor.prototype.undo = function(cell) {
	var data = TableKit.getCellData(cell);
	var row = cell.up('tr');
	var table = cell.up('table');

    /* get the line filename ( identifier ) */
    var identifier = row.id;

    /* Update html */
    for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFiles.length ; ++i ){
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i].filename) == identifier )
        {
            cell.update(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name]);
            tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name] = tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name];
            break;
        }
    }

	var data = TableKit.getCellData(cell);
	data.active = false;

}


musicFieldEditor.prototype._submit = function(e) {
	var cell = Event.findElement(e,'td');
	var form = Event.findElement(e,'form');
	Event.stop(e);
	this.submit(cell,form);
}

musicFieldEditor.prototype.submit = function(cell, form) {
	form = form ? form : cell.down('form');
	var head = $(TableKit.getHeaderCells(null, cell)[TableKit.getCellIndex(cell)]);
	var row = cell.up('tr');
	var table = cell.up('table');

    /* get the line filename ( identifier ) */
    var identifier = row.id;

    /* Update html */
    cell.update( form.firstChild.value );
    
    /* update new value */
    for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier )
        {
            tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name]=form.firstChild.value;
            break;
        }
    }
	var data = TableKit.getCellData(cell);
	data.active = false;
}

musicFieldEditor.prototype.edit = function(cell){  
	cell = $(cell);
    if( cell.hasClassName("static"))
        return;
    
	var table = cell.up('table');
	var row = cell.up('tr');
    var identifier = row.id;
	
	var form = $(document.createElement("form"));
	form.id = cell.id + '-form';
	form.addClassName(TableKit.option('formClassName', table.id)[0]);
	form.onsubmit = this._submit.bindAsEventListener(this);

	var input = document.createElement("input");
    input.type="text";

    /* update new value */
    for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier )
        {
            input.value = tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name];
            break;
        }
    }

	form.appendChild(input);

	var okButton = document.createElement("input");
	okButton.type = "submit";
	okButton.value = "submit";
	okButton.className = 'editor_ok_button';
	form.appendChild(okButton);

	var undoLink = document.createElement("a");
	undoLink.href = "#";
	undoLink.appendChild(document.createTextNode("undo"));
	undoLink.onclick = this._undo.bindAsEventListener(this);
	undoLink.className = 'editor_undo';      
	form.appendChild(undoLink);
	
	var cancelLink = document.createElement("a");
	cancelLink.href = "#";
	cancelLink.appendChild(document.createTextNode("cancel"));
	cancelLink.onclick = this._cancel.bindAsEventListener(this);
	cancelLink.className = 'editor_cancel';      
	form.appendChild(cancelLink);

    cell.innerHTML = '';
	cell.appendChild(form);
}
