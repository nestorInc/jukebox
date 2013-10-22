/* global Notifications */

this.PlaylistTab = Class.create(Tab,
{
	initialize: function(rootCSS, jukebox)
	{
		this.name = "Playlists";
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
	},

	updateContent: function(DOM)
	{
		DOM.update('<h1>Playlists</h1>');

		var that = this;

		function createLoad(name)
		{
			var el = new Element('input', {type: 'button', value: 'Load'});
			el.on("click", J.restorePlayQueue.bind(J, name/*, position*/));
			return el;
		}
		function createDel(name)
		{
			var el = new Element('input', {type: 'button', value: 'Remove'});
			el.on("click", function()
			{
				J.deletePlayQueue(name);
				that.updateContent(DOM); // Force refresh (brutal)
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
		DOM.insert(table);

		var btn = new Element('input', {type: 'button', value: 'Save current playlist'}),
			input = new Element('input', {type: 'text'});
		btn.on("click", function()
		{
			var name = input.value.trim();
			if(name)
			{
				J.savePlayQueue(name);
				Notifications.Display(Notifications.LEVELS.info, "Current playlist save with name " + name);
				that.updateContent(DOM); // Force refresh (brutal)
			}
		});
		DOM.insert(input).insert(btn);
	}
});
