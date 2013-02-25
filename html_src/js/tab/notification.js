this.NotificationTab = Class.create(Tab,
{
	initialize: function(tabName, DOM, rootCSS)
	{
		this.name = tabName;
		this.uploader = null;
		this.DOM = DOM;
		this.rootCSS = rootCSS;
	},

	updateContent: function()
	{
		var $tabContent = this.DOM.down('.'+this.rootCSS+'-tabContent-' + this.identifier);
		$tabContent.update('<h1>Notification tests:</h1>');

		function addButton(level)
		{
			var btn = new Element('input', {type: 'button', value: 'Test ' + level});
			btn.on("click", function()
			{
				Notifications.Display(Notifications.LEVELS[level], "Notification: " + level);
			});
			$tabContent.insert(btn);
		}

		for(var level in Notifications.LEVELS)
		{
			addButton(level);
		}
	}
});
