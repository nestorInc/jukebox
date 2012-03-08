var customQueriesTab = Class.create(Tab, {
    initialize : function( identifier, tabName ){
        // Search parameters 
        this.identifier = identifier;
        this.name = tabName;
        this.unique = 'customQueriesTab';
    },

    updateContent : function( ){
        var custom_queries_display = '';
        custom_queries_display += '<h1>Custom Json Query</h1>';
        custom_queries_display += '<table width="100%">';
        custom_queries_display += '<tr>';
        custom_queries_display += '<td colspan="2">';
        custom_queries_display += '<center>';
        custom_queries_display += '<textarea id="custom_json_query" style="width:95%;height:90px;"></textarea>';
        custom_queries_display += '</center>';
        custom_queries_display += '</td>';
        custom_queries_display += '</tr>';
        custom_queries_display += '<tr>';
        custom_queries_display += '<td>';
        custom_queries_display += 'Query filler : <select id="custom_json_template_list" onchange="fillCustomJsonQuery();">';
        custom_queries_display += '<option value="clear_form">clear_form</option>';
        custom_queries_display += '<option value="dummy" selected="selected">--------</option>';
        custom_queries_display += '<option value="">empty</option>';
        custom_queries_display += '<option value="next">next</option>';
        custom_queries_display += '<option value="previous">previous</option>';
        custom_queries_display += '<option value="add_to_play_queue">add_to_play_queue</option>';
        custom_queries_display += '<option value="remove_to_play_queue">remove_from_play_queue</option>';
        custom_queries_display += '<option value="move_in_play_queue">move_in_play_queue</option>';
        custom_queries_display += '<option value="join_channel">join_channel</option>';
        custom_queries_display += '<option value="get_news">get_news</option>';
        custom_queries_display += '<option value="search">search</option>';
        custom_queries_display += '</select>';
        custom_queries_display += '</td>';
        custom_queries_display += '<td><input type="submit" onclick="checkAndSendJson();" value="send custom query"/></td>';
        custom_queries_display += '</tr>';
        custom_queries_display += '</table>';
        $('tabContent_' + this.identifier).update(custom_queries_display);
    }

});
