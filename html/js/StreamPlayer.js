(function()
{
	// http://jssoundkit.sourceforge.net/
	// http://help.adobe.com/en_US/AS2LCR/Flash_10.0/help.html?content=00001523.html
	// http://forums.mediabox.fr/wiki2/documentation/flash/as2/sound

	var streamPlayer, // Player
		// Cached selectors
		$playStream,
		$stopStream,
		$streamVolume;

	document.observe("dom:loaded", function()
	{
		streamPlayer = new Sound();

		// Set selectors
		$playStream = $("play_stream");
		$stopStream = $("stop_stream");
		$streamVolume = $("streamVolume");

		// Register listeners
		$playStream.on("click", PlayStream);
		$stopStream.on("click", StopStream);
		$("streamVolumeBtn").on("click", SetVolume);

		Event.observe(window, 'load', function()
		{
			// Require full flash load, else ".proxyMethods" does not exists yet on flash object
			RefreshVolume();
		});
	});

	function PlayStream()
	{
		streamPlayer.loadSound('/stream', true);
		SetVolume($streamVolume.value); // loadSound reset to 100 -> force to desired value

		$playStream.hide();
		$stopStream.show();
	}
	function StopStream()
	{
		streamPlayer.stop();
		$playStream.show();
		$stopStream.hide();
	}

	function SetVolume()
	{
		var num = Number($streamVolume.value);
		if(num < 0 || num > 100)
		{
			RefreshVolume();
		}
		else
		{
			streamPlayer.setVolume(num); // 0-100
		}
	}

	// Display current volume in input
	function RefreshVolume()
	{
		$streamVolume.value = streamPlayer.getVolume();
	}

})();