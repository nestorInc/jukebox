function PlayStream () {
	streamPlayer.loadSound('/ch', true);
    $('play_stream').hide();
    $('stop_stream').show();
}
function StopStream () {
    streamPlayer.stop();
    $('play_stream').show();
    $('stop_stream').hide();
}
