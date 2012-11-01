this.NotificationTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.uploader = null;
		this.unique = "NotificationTab";
	},

	updateContent: function()
	{
		var $tabContent = $('tabContent-' + this.identifier);
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
