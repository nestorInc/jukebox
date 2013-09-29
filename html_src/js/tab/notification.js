this.NotificationTab = Class.create(Tab,
{
	initialize: function(rootCSS)
	{
		this.name = "Notifications";
		this.rootCSS = rootCSS;
	},

	updateContent: function(DOM)
	{
		DOM.update('<h1>Notification tests</h1>');

		function addButton(level)
		{
			var btn = new Element('input', {type: 'button', value: 'Test ' + level});
			btn.on("click", function()
			{
				Notifications.Display(Notifications.LEVELS[level], "Notification: " + level);
			});
			DOM.insert(btn);
		}

		for(var level in Notifications.LEVELS)
		{
			addButton(level);
		}
	}
});
