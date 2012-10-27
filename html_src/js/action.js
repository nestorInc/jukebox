/**
* Represents an Action that is going to be sent to server.
* @constructor
* @param {string} name - The name of the action.
* @param {object} [opts] - The facultative options.
* @return {Action} The Action object.
*/
function Action(name, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new Action(name, opts);
	}

	this.name = name;
	switch(name)
	{
		case "join_channel":
			this.channel = opts.channel;
			break;
		case "next":
		case "previous":
		case "shuffle_play_queue":
		case "get_uploaded_files":
			// Nothing particular, but declared as valid actions
			break;
		case "add_to_play_queue":
		case "remove_from_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			break;
		case "move_in_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			this.new_play_queue_index = opts.new_play_queue_index;
			break;
		case "get_news":
			this.first_result = opts.first_result;
			this.result_count = opts.result_count;
			break;
		case "select_plugin":
			// TODO : get rid of channel. Server should know in which channel client is.
			this.channel = opts.channel;
			this.plugin_name = opts.plugin_name;
			break;
		case "search":
		case "update_uploaded_file":
		case "add_search_to_play_queue":
			Extend(this, opts);
			break;
		case "delete_uploaded_file":
		case "validate_uploaded_file":
			this.file_name = opts.file_name;
			break;
		default:
			throw new Error("Invalid action");
	}

	Object.seal(this);
}

/**
* Helper to compute a search Action
* @param {int} page 
* @param {int} identifier 
* @param {string} select_fields 
* @param {string} search_value 
* @param {string} search_comparison 
* @param {string} search_field 
* @param {string} order_by 
* @param {int} result_count 
* @param {bool} select 
* @return {Action} The search action.
*/
Action.search = function(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select)
{
	var opts =
	{
		identifier: identifier ? identifier : null,
		select: !!select,

		search_value: search_value,
		search_comparison: search_comparison ? search_comparison : search_field != 'genre' ? 'like' : 'equal',
		search_field: search_field,

		first_result: (!page || page == 1) ? 0 : page,
		result_count: result_count
	};
	if(order_by)
	{
		opts.order_by = order_by;
	}
	if(select_fields)
	{
		opts.select_fields = select_fields;
	}

	var searchOpts = Extend({}, Action.search.defaultOptions, opts);
	return new Action('search', searchOpts);
};

Action.search.defaultOptions =
{
	search_value: '',
	search_comparison: 'like', // strict, like, equal
	search_field: '', // ex.: title, artist, album
	order_by: 'artist,album,track,title', // ex.: title COLLATE NOCASE DESC, artist ASC, album
	select_fields: 'mid,title,album,artist,track,genre,duration',
	first_result: 0,
	result_count: 20
};
