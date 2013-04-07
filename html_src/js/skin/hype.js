Jukebox.UI.skins["hype"] =
{
	params:
	{
		allowTabs: false,
		dragdrop: false,
		playQueueNode: 'tbody',
		songNode: 'tr'
	},
	defaultTheme: 'white',
	themes: ['white', 'blue'],
	templates:
	{
		player:
'<div class="#{root} #{root}-theme-#{theme}">\
<div class="#{root}-main">\
<div class="#{root}-main-titlebar">\
<table class="#{root}-main-titlebar">\
<tr>\
<td class="#{root}-main-titlebar-title">\
Home made jukebox over streaming\
</td>\
<td class="#{root}-listening">\
	<div class="#{root}-listening-ico"></div>\
	<div class="#{root}-listening-count">#{listenersCount}</div>\
</td>\
<td class="#{root}-main-titlebar-refresh-button">\
	<input type="button" class="#{root}-refresh-button" value="" />\
</td>\
<td class="#{root}-main-titlebar-autorefresh-checkbox">\
	<input type="checkbox" name="#{root}-autorefresh" class="#{root}-autorefresh" checked="checked" value="autorefresh" />\
</td>\
<td class="#{root}-activity"></td>\
<tr>\
</table>\
</div>\
<table class="#{root}-main-current-song">\
<tr>\
	<td class="#{root}-main-current-song-cover">\
		<div class="#{root}-main-current-song-cover-wrapper">\
			<img class="#{root}-song-cover #{root}-main-current-song-cover" />\
		</div>\
	</td>\
	<td class="#{root}-main-current-song-infos">\
		<table class="#{root}-main-current-song-infos">\
			<tr class="#{root}-main-current-song-infos-text">\
				<td>\
					<div class="#{root}-song-title"></div>\
					<div class="#{root}-song-artist"></div>\
					<div class="#{root}-song-album"></div>\
				</td>\
			</tr>\
			<tr>\
				<td class="#{root}-progressbar-container">\
					<p class="#{root}-song-time"></p>\
					<div class="#{root}-progressbar-wrapper">\
						<div class="#{root}-progressbar"></div>\
					</div>\
				</td>\
			</tr>\
		</table>\
	</td>\
</tr>\
</table>\
<table class="#{root}-main">\
<tr>\
	<td class="#{root}-expand-collapse">\
		<a href="javascript:;" class="#{root}-expand-button #{root}-btn"><span class="#{root}-expand-button-icon"></span></a>\
		<a href="javascript:;" class="#{root}-collapse-button #{root}-btn-pushed"><span class="#{root}-expand-button-icon"></span></a>\
	</td>\
	<td class="#{root}-controls">\
		<a href="javascript:;" class="#{root}-btn #{root}-previous-button"><span class="#{root}-previous-button-icon"></span></a>\
		<a href="javascript:;" class="#{root}-btn #{root}-stream-play" title="#{play}"><span class="#{root}-stream-play-icon"></span></a>\
		<a href="javascript:;" class="#{root}-btn #{root}-stream-stop" title="#{stop}"><span class="#{root}-stream-stop-icon"></span></a>\
		<a href="javascript:;" class="#{root}-btn #{root}-next-button"><span class="#{root}-next-button-icon"></span></a>\
	</td>\
	<td class="#{root}-volume">\
		<div class="#{root}-volume-ico"></div>\
		<div class="#{root}-slider #{root}-volume-slider">\
			<div class="#{root}-slider-handle"></div>\
		</div>\
	</td>\
	</tr>\
</table>\
</div>\
\
<div class="#{root}-playqueue">\
	<div class="#{root}-playqueue-content"></div>\
</div>\
</div>',
		song:
'<div class="#{root}-song">\
<div class="#{root}-song-title">#{title}</div>\
<div>\
	<a class="#{root}-song-artist" href="javascript:;">#{artist}</a> - \
	<a class="#{root}-song-album" href="javascript:;">#{album}</a>\
</div>\
</div>',
		playQueue: '',
		playQueueSong:
'<tr class="#{root}-playqueue-#{index}">\
<td>#{index}</td>\
<td>\
	<a href="javascript:;">#{artist}</a> - \
	<a href="javascript:;">#{album}</a> - \
	#{title}\
</td>\
<td>#{duration}</td>\
</tr>'
	}
};