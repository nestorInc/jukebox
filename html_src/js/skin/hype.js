Jukebox.UI.skins["hype"] =
{
	params:
	{
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
<table class="#{root}-main">\
<tr>\
	<td class="#{root}-activity"></td>\
	<td class="#{root}-controls">\
		<a href="javascript:;" class="#{root}-previous-button"></a>\
		<a href="javascript:;" class="#{root}-stream-play" title="#{play}"></a>\
		<a href="javascript:;" class="#{root}-stream-stop" title="#{stop}"></a>\
		<a href="javascript:;" class="#{root}-next-button"></a>\
	</td>\
	<td class="#{root}-progressbar-container">\
		<p class="#{root}-song-time"></p>\
		<div class="#{root}-progressbar-wrapper">\
			<div class="#{root}-progressbar"></div>\
		</div>\
	</td>\
	<td>\
		#{currentSong}\
	</td>\
	<td class="#{root}-volume">\
		<div class="#{root}-volume-ico"></div>\
		<div class="#{root}-volume-slider">\
			<div class="#{root}-volume-handle"></div>\
		</div>\
	</td>\
	<td class="#{root}-listening">\
		<div class="#{root}-listening-ico"></div>\
		<div class="#{root}-listening-count">#{listenersCount}</div>\
	</td>\
	<td class="#{root}-expand-collapse">\
		<a href="javascript:;" class="#{root}-expand-button"></a>\
		<a href="javascript:;" class="#{root}-collapse-button"></a>\
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