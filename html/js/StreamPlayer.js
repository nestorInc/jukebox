function PlayStream () {
    streamPlayer.loadSound('/stream', true);
    $('play_stream').hide();
    $('stop_stream').show();
}
function StopStream () {
    streamPlayer.stop();
    $('play_stream').show();
    $('stop_stream').hide();
}
