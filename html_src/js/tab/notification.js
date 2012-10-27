var NotificationTab = Class.create(Tab,
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
		var $tabContent = $('tabContent_' + this.identifier);
		$tabContent.update('<h1>Notification tests:</h1>');

		for(var level in Notifications.LEVELS)
		{
			addButton(level);
		}

		function addButton(level)
		{
			var btn = new Element('input', {type: 'button', value: 'Test ' + level});
			btn.on("click", function()
			{
				Notifications.Display(Notifications.LEVELS[level], "Notification: " + level);
			});
			$tabContent.insert(btn);
		}
	}
});
