(function()
{
	var streamPlayer;
	document.observe("dom:loaded", function()
	{
		streamPlayer = new Sound();
	});

	this.PlayStream = function()
	{
		streamPlayer.loadSound('/stream', true);
		$('play_stream').hide();
		$('stop_stream').show();
	}
	this.StopStream = function()
	{
		streamPlayer.stop();
		$('play_stream').show();
		$('stop_stream').hide();
	}
})();