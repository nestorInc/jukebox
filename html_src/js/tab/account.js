/* global  Tab, Class */

this.AccountTab = Class.create(Tab, 
{
    initialize: function(rootCSS)
	{
		this.name = "Account ";
		this.rootCSS = rootCSS;
	},


	updateContent: function(DOM)
	{
		var account_display = '' +
		'<h1>Informations personelles</h1>' +
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
		DOM.update(account_display);
	}
});

