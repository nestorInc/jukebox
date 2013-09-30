/* global JsonPrettyPrint, Tab, Class */

this.DebugTab = Class.create(Tab, 
{
	initialize: function(rootCSS)
	{
		this.name = "Debug";
		this.rootCSS = rootCSS;
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
			this.$debug2.update('<h2>Data received:</h2>' +
				'<p> ' + responseText + '</p>' +
				'<h2>JSON response: </h2>' +
				'<p>' + JsonPrettyPrint(responseText.evalJSON()) + '</p>'
			);
		}
	},

	updateContent: function(DOM)
	{
		var debug_display = '' +
		'<h1>Debug console</h1>' +
		'<table width="100%">' +
		'<tr>' +
			'<td width="50%">' +
				'<div></div>' +
			'</td>' +
			'<td width="50%">' +
				'<div></div>' +
			'</td>' +
		'</tr>' +
		'</table>';
		DOM.update(debug_display);

		this.$debug1 = DOM.down('div:first');
		this.$debug2 = DOM.down('div:last');
	}
});

