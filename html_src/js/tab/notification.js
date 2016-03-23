this.NotificationTab = Class.create(Tab,
{
	initialize: function(rootCSS)
	{
		this.name = "Notifications";
		this.iconName = "sms";
		this.category = "debug";
		this.permanent = true;
		this.rootCSS = rootCSS;
	},

	updateContent: function(DOM)
	{
		DOM.update('<p class="' + this.rootCSS + '-tab-title">Notification tests</p>');

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
