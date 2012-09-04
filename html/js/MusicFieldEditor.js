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
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i].filename) == identifier ){
            /* Show validate */
            if( 1 == $('upload_line_' + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename)).select('[class="modified"]').length){
                $('upload_line_' + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename)).select('[name="update"]').each( function(e){ e.hide();});
                $('upload_line_' + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename)).select('[name="validate"]').each( function(e){ e.show();});
            }
            if(this.name == "track") {
                cell.update(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["track"].split('/')[0]);
            } else if (this.name == "trackNb"){
                cell.update(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["track"].split('/')[1]);
            } else {
                cell.update(tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name]);
            }
            tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name] = tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name];
            break;
        }
    }

    /* remove cell style modified */
    cell.removeClassName("modified");

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
    if(this.name == "genre"){
        for( var i = 0; i< genres.length ;++i){
            if( form.firstChild.value == genres[i][1]  ){
                cell.update( genres[i][0] );
            }
        }
    } else {
        cell.update( form.firstChild.value );
    }    
    /* update new value */
    for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier )
        {
            if(this.name == "genre"){
                tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name]=form.firstChild.options[form.firstChild.selectedIndex].value;
            } else if(this.name == "track"){
                if( -1 == tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name].toString().indexOf("/") ) {
                    tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name]=form.firstChild.value + "/0";
                } else {
                    tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name]=form.firstChild.value + "/" + tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name].split("/")[1];
                }
            } else if(this.name == "trackNb"){
                if( -1 == tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().indexOf("/") ) {
                    tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"]= tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"] + "/" + form.firstChild.value;
                } else {
                    tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"] =  tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().split('/')[0] + "/" + form.firstChild.value;
                } 
            } else {
                tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name] = form.firstChild.value;
            }

            /* Upload cell style If the new value differs */
            if( ((this.name == "track" && tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name].split('/')[0] != form.firstChild.value ) ||
                (this.name == "trackNb" && tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["track"].split('/')[1] != form.firstChild.value ) ||
                ( this.name != "track" && this.name != "trackNb" && 
                  form.firstChild.value != tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name] )) 
                && !cell.hasClassName("modified")){

                /* Default behaviour*/
                cell.addClassName("modified");


                /* hide update */
                $('upload_line_' + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename)).select('[name="update"]').each(function(e){
                    e.show();
                });

                /* Show validate */
                $('upload_line_' + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename)).select('[name="validate"]').each(function(e){
                    e.hide();
                });

            } else if(form.firstChild.value == tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name] &&
                cell.hasClassName("modified")){
                cell.removeClassName("modified");
            }

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
	/* Change behaviour following the column name */
	var form = $(document.createElement("form"));
	form.id = cell.id + '-form';
	form.addClassName(TableKit.option('formClassName', table.id)[0]);
	form.onsubmit = this._submit.bindAsEventListener(this);

    /* Change behavior from field names */
    var input = null;
    var modified = false;

    if( this.name == "genre" ){
        /* create genre element add fill options */ 
	    var input = document.createElement("select");
        input.id="genre";
        form.appendChild(input);

        for( var i = 0; i< genres.length ;++i){
            var option = document.createElement("option");
            option.value = genres[i][1];
            option.appendChild(document.createTextNode(genres[i][0]));
            input.appendChild(option);
        }

        for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
            if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier ){
                if( tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["genre"] != tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["genre"]){
                    modified = true;
                }
            }
        }

        
    } else {
	    input = document.createElement("input");
        input.type="text";

        /* update new value */
        for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
            if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier ){
                if( this.name == "track" ) {
                    if( tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().indexOf('/') == -1) {
                        input.value = tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"]
                    } else {
                        input.value = tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().split('/')[0];
                        if( tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().split('/')[1] != tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["track"].toString().split('/')[1]){
                            modified = true;
                        }

                    }
                } else if( this.name == "trackNb" ){
                    if( tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().indexOf('/') == -1) {
                        input.value = "0";
                    } else {
                        input.value = tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().split('/')[1];
                        if( tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i]["track"].toString().split('/')[1] != tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i]["track"].toString().split('/')[1]){
                            modified = true;
                        }
                    }
                } else {
                    input.value = tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name];
                    if(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name] != tabs.getFirstTabByClassName("UploadTab").uploadedFiles[i][this.name]){
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

    if( modified ){
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

    /* update new value */
    for( var i =0; i < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition.length ; ++i ){
        if( "upload_line_" + escape(tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i].filename) == identifier )
        {
            /* Automatically select genre */
            var options = $$('select#genre option');
            var len = options.length;
            if( len > 0 && len < tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name])
                options[len-1].selected = true;
            for (var j = 0; j < len; j++) {
                if(options[j].value == tabs.getFirstTabByClassName("UploadTab").uploadedFilesEdition[i][this.name]){
                    options[j].selected = true;
                        break;
                }
            }
        }
    }



}
