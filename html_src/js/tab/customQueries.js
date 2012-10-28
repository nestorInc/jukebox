this.CustomQueriesTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.unique = 'CustomQueriesTab';
	},

	updateContent: function()
	{
		var custom_queries_display = '' +
		'<h1>Custom Json Query</h1>' +
		'<table width="100%">' +
		'<tr>' +
			'<td colspan="2">' +
			'<center>' +
				'<textarea style="width:100%;height:160px;"></textarea>' +
			'</center>' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
				'Query filler : ' +
				'<select>' +
					'<option value="clear_form">clear_form</option>' +
					'<option value="dummy" selected="selected">--------</option>' +
					'<option value="empty">empty</option>' +
					'<option value="next">next</option>' +
					'<option value="previous">previous</option>' +
					'<option value="add_to_play_queue">add_to_play_queue</option>' +
					'<option value="remove_from_play_queue">remove_from_play_queue</option>' +
					'<option value="move_in_play_queue">move_in_play_queue</option>' +
					'<option value="join_channel">join_channel</option>' +
					'<option value="get_news">get_news</option>' +
					'<option value="search">search</option>' +
				'</select>' +
			'</td>' +
			'<td><input type="button" value="send custom query"/></td>' +
		'</tr>' +
		'</table>';
		var $content = $('tabContent-' + this.identifier);
		$content.update(custom_queries_display);

		var $textarea = $content.down('textarea');

		//----------
		// Combobox

		var $select = $content.down('select');
		$select.on("change", function fillCustomJsonQuery()
		{
			var opts = {},
				value = this.value; // this.options[this.selectedIndex].value;
			
			switch(value)
			{
				case "dummy":
					return false;
				case "clear_form":
					$textarea.value = '';
					this.selectedIndex = 1;
					return false;
				case "add_to_play_queue":
				case "remove_from_play_queue":
				case "move_in_play_queue":
					opts = 
					{
						mid: 123,
						play_queue_index: 1
					};
					break;
				case "join_channel":
					opts =
					{
						channel: "trashman"
					};
					break;
				case "get_news":
					opts = 
					{
						first_result: 0,
						result_count: 5
					};
					break;
				case "search":
					opts = 
					{
						search_value: "muse",
						search_field: "artist",
						order_by: "artist",
						first_result: 0,
						result_count: 10
					};
					break;
			}
			if(value == "move_in_play_queue")
			{
				opts.new_play_queue_index = 0;		
			}

			var actions = value == "empty" ? [] : [new Action(value, opts)];
			var query = new Query(1317675258, actions);	
			$textarea.value = JSON.stringify(query.valueOf(), null, "\t"); // query.toJSON(); doesn't support custom indentation
			this.selectedIndex = 1;

			return false; // Stop event
		});

		//----------
		// Button

		var $input = $content.down('input');
		$input.on("click", function checkAndSendJson()
		{
			// Check if the textarea is filled
			if($textarea.value === '')
			{
				Notifications.Display(Notifications.LEVELS.warning, 'Please fill the textarea');
				return;
			}

			// Check if the textarea contains a valid json query ; TODO: better check by reusing Query constructor?
			var action = JSON.parse($textarea.value);
			if(action)
			{
				//TODO _sendQuery(query); But it is a private method...
				//TODO new Ajax.Request(_URL,) ? No! Jukebox won't analyze response and update ui...
				//
				// Anyway Query and Action are not available here so this tab isn't working for now.
			}
		});
	}
});
