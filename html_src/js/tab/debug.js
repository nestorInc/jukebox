/* global JsonPrettyPrint, Tab, Class */

this.DebugTab = Class.create(Tab, 
{
	initialize: function(rootCSS, jukebox, template)
	{
		this.name = "Debug";
		this.iconName = "bug_report";
		this.category = "debug";
		this.permanent = true;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
	},

	updateSendingQuery: function(query)
	{
		this.$debug1.update('<h2>Data sent</h2><p>' + JsonPrettyPrint(query) + '</p>');
		this.$debug2.update('<h2>Waiting for response...</h2>');
	},

	updateResponse: function(responseText)
	{
		if(!responseText)
		{
			this.$debug2.update('<img src="images/server_down.jpg" />');
		}
		else
		{
			this.$debug2.update('<h2>JSON response: </h2>' +
				'<p>' + JsonPrettyPrint(responseText.evalJSON()) + '</p>'
			);
		}
	},

	updateContent: function(DOM)
	{
		var debug_display = '' +
		'<p class="' + this.rootCSS + '-tab-title">Debug console</p>' +
		'<div class="' + this.rootCSS + '-debug-tab">' +
		'<input type="button" class="' + this.rootCSS + '-refresh-button" value="Refresh" />' +
		'<input type="checkbox" name="' + this.rootCSS + '-autorefresh" class="' + this.rootCSS + '-autorefresh" checked="checked" value="autorefresh" />' +
		'<table width="100%">' +
		'<tr>' +
			'<td width="50%">' +
				'<div class="sent"></div>' +
			'</td>' +
			'<td width="50%">' +
				'<div class="received"></div>' +
			'</td>' +
		'</tr>' +
		'</table>' +
		'</div>';
		DOM.update(debug_display);

		this.$debug1 = DOM.down('.sent');
		this.$debug2 = DOM.down('.received');

		DOM.down('.jukebox-refresh-button').on('click', this.refresh.bind(this));
		this.cbAutoRefresh = DOM.down('.jukebox-autorefresh');
		this.cbAutoRefresh.on('change', this.autoRefreshChange.bind(this));

	},
	autoRefreshChange: function()
	{
		this.jukebox.autoRefresh(this.cbAutoRefresh.getValue());
	},
	refresh: function()
	{
		this.jukebox.refresh();
	}
});

