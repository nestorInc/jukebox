var CustomQueriesTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		// Search parameters 
		this.identifier = identifier;
		this.name = tabName;
		this.unique = 'CustomQueriesTab';
	},

	updateContent: function()
	{
		var custom_queries_display = '';
		'<h1>Custom Json Query</h1>' +
		'<table width="100%">' +
		'<tr>' +
			'<td colspan="2">' +
			'<center>' +
				'<textarea id="custom_json_query" style="width:95%;height:90px;"></textarea>' +
			'</center>' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
				'Query filler : ' +
				'<select id="custom_json_template_list" onchange="fillCustomJsonQuery();">' +
					'<option value="clear_form">clear_form</option>' +
					'<option value="dummy" selected="selected">--------</option>' +
					'<option value="">empty</option>' +
					'<option value="next">next</option>' +
					'<option value="previous">previous</option>' +
					'<option value="add_to_play_queue">add_to_play_queue</option>' +
					'<option value="remove_to_play_queue">remove_from_play_queue</option>' +
					'<option value="move_in_play_queue">move_in_play_queue</option>' +
					'<option value="join_channel">join_channel</option>' +
					'<option value="get_news">get_news</option>' +
					'<option value="search">search</option>' +
				'</select>' +
			'</td>' +
			'<td><input type="submit" onclick="checkAndSendJson();" value="send custom query"/></td>' +
		'</tr>' +
		'</table>';
		$('tabContent_' + this.identifier).update(custom_queries_display);
	}

});
