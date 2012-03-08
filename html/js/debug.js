var debugTab = Class.create(Tab, {
    initialize : function( identifier, tabName ){
        // Search parameters 
        this.identifier = identifier;
        this.name = tabName;
        this.unique = 'debugTab';
    },

    updateSendingQuery : function(query){
        $('debug1').update('<h2>Data sent</h2><p>' + jsonPrettyPrint(query) + '</p>');
        $('debug2').update('<h2>Waiting for response...</h2>');
    },

    updateResponse : function(response){

        if(response == null || response.responseText == null || response.responseText == '') {
                $('debug2').update('<img src="images/server_down.jpg" />');
        } else {
            $('debug2').update('<h2>Data received</h2><p>' + response.responseText + '</p>');
            $('debug2').update('<h2>Data received</h2><p> ' + response.responseText + '</p><h2>JSON response : </h2><p>' + jsonPrettyPrint(response.responseText.evalJSON()) + '</p>');
        }
    },


    updateContent : function(){
        var debug_display = '';
        debug_display += '<h1>Debug console</h1>';
        debug_display += '<table width="100%"><tr><td width="50%">';
        debug_display += '<div id="debug1">';
        debug_display += '</div>';
        debug_display += '</td><td width="50%">';
        debug_display += '<div id="debug2">';
        debug_display += '</div>';
        debug_display += '</td></tr>';
        debug_display += '</table>';
        $('tabContent_' + this.identifier).update(debug_display);
        
    }

});
