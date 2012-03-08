var uploadTab = Class.create(Tab, {
    initialize : function( identifier, tabName ){
        // Search parameters 
        this.identifier = identifier;
        this.name = tabName;
        this.uploader = null;
        this.unique="UploadTab";
    },

    updateContent : function( ){
        var upload_form = '';
        upload_form += '<div id="file-uploader' + this.identifier +'">';
        upload_form += '<div class="qq-uploader">';
        upload_form += '<div class="qq-upload-drop-area" style="display: none;">';
        upload_form += '<span>Drop files here to upload</span>';
        upload_form += '</div>';
        upload_form += '<div class="qq-upload-button" style="position: relative; overflow: hidden; direction: ltr;">';
        upload_form += 'Upload files';
        upload_form += '<input type="file" multiple="multiple" name="file"';
        upload_form += 'style="position:absolute; right:0pt; top:0pt; font-family:Arial; font-size:118px; margin:0pt; padding:0pt; cursor:pointer; opacity:0;">';
        upload_form += '</div>';
        upload_form += '<ul class="qq-upload-list">';
        upload_form += '</ul>';
        upload_form += '</div>';
        upload_form += '</div>';
        upload_form += '<h2>Uploaded files</h2>';
        upload_form += '<div id="uploaded_files">';
        upload_form += '</div>';
            
        $('tabContent_' + this.identifier).update(upload_form);

        // Init upload button behavior
        this.uploader = new qq.FileUploader({
            element: document.getElementById('file-uploader' + this.identifier),
            action: 'upload',
            params: {
                id: this.identifier
            },
            debug: true
        });

        // Send a json query to obtain the list off uploaded files
        query = new Object();
        query.action = new Object();
        query.action.name = "get_uploaded_files";
        updateJukebox();
    }

});
