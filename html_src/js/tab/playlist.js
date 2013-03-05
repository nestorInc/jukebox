this.PlaylistTab = Class.create(Tab,
{
	initialize: function(tabName, DOM, rootCSS, jukebox)
	{
		this.name = tabName;
		this.DOM = DOM;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
	},

	updateContent: function()
	{
		var $tabContent = this.DOM.down('.'+this.rootCSS+'-tabContent-' + this.identifier);
		$tabContent.update('<h1>Playlists</h1>');

		var that = this;

		function createLoad(name)
		{
			var el = new Element('input', {type: 'button', value: 'Load'});
			el.on("click", function()
			{
				J.restorePlayQueue(name/*, position*/);
			});
			return el;
		}
		function createDel(name)
		{
			var el = new Element('input', {type: 'button', value: 'Remove'});
			el.on("click", function()
			{
				J.deletePlayQueue(name);
				that.updateContent(); // Force refresh (brutal)
			});
			return el;
		}

		var J = this.jukebox,
			playlists = J.getPlayQueues(),
			table = new Element('table').addClassName(this.rootCSS+'-playlists');
		for(var i = 0, len = playlists.length; i < len; ++i)
		{
			var id = playlists[i],
				tr = new Element('tr'),
				name = new Element('td').insert(id),
				load = new Element('td').insert(createLoad(id)),
				del = new Element('td').insert(createDel(id));

			tr.insert(load).insert(
			{
				top: name,
				bottom: del
			});
			table.insert(tr);
		}
		$tabContent.insert(table);

		var btn = new Element('input', {type: 'button', value: 'Save current playlist'}),
			input = new Element('input', {type: 'text'});
		btn.on("click", function()
		{
			var name = input.value.trim();
			if(name)
			{
				J.savePlayQueue(name);
				Notifications.Display(Notifications.LEVELS.info, "Current playlist save with name " + name);
				that.updateContent(); // Force refresh (brutal)
			}
		});
		$tabContent.insert(input).insert(btn);
	}
});
