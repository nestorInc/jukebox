/* global Tab, Class, Songlist */

this.PlayQueueTab = Class.create(Tab,
{
	initialize: function(rootCSS, jukebox, template)
	{
		this.name = "On air";
		this.iconName = "hearing";
		this.category = "head";
		this.permanent = true;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
	},

	updateContent: function(DOM)
	{
		this.DOM = DOM;
		var tpl = new Template(this.template.main),
		tplVars =
		{
			root: this.rootCSS
		},
		evaluated = tpl.evaluate(tplVars);

		this.DOM = DOM;
		this.DOM.update(evaluated);

		var headerActions = [
			{ name: 'shuffle', icon: 'shuffle', callback: this.shuffle.bind(this) },
			{ name: 'delete-all', icon: 'delete_forever', callback: this.removeAll.bind(this) }
		];
		var songActions = [
			{ name: 'move-top', icon: 'vertical_align_top', callback: this.moveSongToTop.bind(this) },
			{ name: 'move-bottom', icon: 'vertical_align_bottom', callback: this.moveSongToBottom.bind(this) },
			{ name: 'delete', icon: 'delete_forever', callback: this.removeSong.bind(this) }
		];

		var columns = [ 'artist', 'album', 'title', 'duration', 'controls' ];
		this.songList = new Songlist(this.rootCSS, this.jukebox, this.template, this.DOM.down('.'+this.rootCSS+'-playqueue-content'),
							columns, headerActions, songActions, // Content
							true, this.onPlayQueueDrop.bind(this)); // Drag and drop
	},

	setSongs: function(songs)
	{
		this.songList.setSongs(songs);
	},

	moveSongToTop: function(mid, listIndex)
	{
		this.jukebox.playQueueMove(mid, listIndex, 0);
	},

	moveSongToBottom: function(mid, listIndex, count)
	{
		this.jukebox.playQueueMove(mid, listIndex, count - 1);
	},

	removeSong: function(mid, listIndex)
	{
		this.jukebox.playQueueDelete(mid, listIndex);
	},

	removeAll: function()
	{
		this.jukebox.playQueueDelete();
	},

	shuffle: function()
	{
		this.jukebox.playQueueShuffle();
	},

	onPlayQueueDrop: function(mid, oldIndex, newIndex)
	{
		this.jukebox.playQueueMove(mid, oldIndex, newIndex);
	}

});
