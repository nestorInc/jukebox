/* jshint multistr: true, sub: true */
/* global Jukebox */

Jukebox.UI.skins["default"] =
{
	params:
	{
		allowTabs: true,
		dragdrop: true,
		defaultTab: 'PlayQueueTab',
		backgroundColor: '#383838'
	},
	templates:
	{
	player:
'<div class="#{root}">\
	<div class="#{root}-topbar-wrapper bg-color-darkest">\
		<div class="left-icon">\
			<i class="material-icons #{root}-activity">import_export</i>&nbsp;\
		</div>\
		<div class="left">\
			<span class="#{root}-channel-display">channel_name</span> (<span class="#{root}-listening-count"></span> listeners)\
			<a href="/api/token.m3u">Open stream</a>\
		</div>\
		<div class="right-icon">\
			<a href="javascript:;" class="#{root}-disconnect-button">\
				<i class="material-icons">exit_to_app</i>&nbsp;\
			</a>\
		</div>\
		<div class="right">\
				<span class="#{root}-user-display"></span>\
		</div>\
		<div class="right-icon">\
			<i class="material-icons">account_box</i>&nbsp;\
		</div>\
	</div>\
	<div class="#{root}-playcontrols-wrapper bg-color-light">\
		<a href="javascript:;" class="#{root}-previous-button #{root}-button #{root}-button-skip"><i class="material-icons">skip_previous</i></a>\
		<a href="javascript:;" class="#{root}-stream-play #{root}-button #{root}-button-play"><i class="material-icons">play_circle_outline</i></a>\
		<a href="javascript:;" class="#{root}-stream-stop #{root}-button #{root}-button-stop" style="display: none;"><i class="material-icons">stop</i></a>\
		<a href="javascript:;" class="#{root}-next-button #{root}-button #{root}-button-skip"><i class="material-icons">skip_next</i></a>\
		<div class="#{root}-volume">\
			<i class="material-icons">volume_up</i>\
			<span class="#{root}-slider #{root}-volume-slider">\
				<div class="#{root}-slider-handle"></div>\
			</span>\
			<br clear="all" />\
		</div>\
	</div>\
	<div class="#{root}-currentsong-wrapper bg-color-light">\
		<div class="coverart-wrapper">\
			<img src="images/no_cover.png" alt="cover art" />\
		</div>\
		<div class="songinfos-wrapper">\
			<p class="song-title #{root}-song-title"><a href="javascript:;"></a></p>\
			<p class="song-title-details"><span class="#{root}-song-artist"><a href="javascript:;"></a></span>&nbsp;-&nbsp;<span class="#{root}-song-album"><a href="javascript:;"></a></span></p>\
			<div class="song-progress">\
				<span class="#{root}-song-time time">00:00</span>\
				<span class="#{root}-progressbar-wrapper">\
					<span class="#{root}-progressbar"></span>\
				</span>\
				<span class="#{root}-song-total-time time">00:00</span>\
			</div>\
		</div>\
	</div>\
	<div class="#{root}-tabs-links #{root}-sidepanel-wrapper bg-color-light">\
		<div class="list-separator"></div>\
		<div class="#{root}-tabs"><div class="#{root}-tabs-list">\
		<div class="#{root}-tab-list-head"></div>\
		<div class="list-separator"></div>\
		<div class="toggle-category-container">\
			<p><a href="javascript:;" class="toggle-category-container-button"><span class="list-category"><i class="material-icons toggle-category-item">keyboard_arrow_down</i><i class="material-icons toggle-category-item" style="display: none;">keyboard_arrow_right</i><span class="list-title">Playlists</span></span></a></p>\
			<div class="#{root}-tab-list-playlist toggle-category-item"></div>\
		</div>\
		<div class="list-separator"></div>\
		<div class="toggle-category-container">\
			<p><a href="javascript:;" class="toggle-category-container-button"><span class="list-category"><i class="material-icons toggle-category-item">keyboard_arrow_down</i><i class="material-icons toggle-category-item" style="display: none;">keyboard_arrow_right</i><span class="list-title">Browse</span></span></a></p>\
			<div class="list-search-input toggle-category-item">\
				<input type="text" class="#{root}-search-input"/>\
				<select class="#{root}-search-field">\
					<option value="artist">Artist</option>\
					<option value="title">Title</option>\
					<option value="album">Album</option>\
					<option value="genre">Genre</option>\
				</select>\
				<select class="#{root}-results-per-page">\
					<option value="10" selected="selected">10</option>\
					<option value="20">20</option>\
					<option value="30">30</option>\
					<option value="40">40</option>\
					<option value="50">50</option>\
					<option value="60">60</option>\
					<option value="70">70</option>\
					<option value="80">80</option>\
					<option value="90">90</option>\
					<option value="100">100</option>\
				</select>\
				<input type="button" class="#{root}-search-button" value="Search" />\
			</div>\
			<div class="#{root}-tab-list-search toggle-category-item"></div>\
		</div>\
		<div class="list-separator"></div>\
		<div class="list-separator"></div>\
		<div class="#{root}-tab-list-tail"></div>\
		<div class="list-separator"></div>\
		<div class="toggle-category-container">\
			<p><a href="javascript:;" class="toggle-category-container-button"><span class="list-category"><i class="material-icons toggle-category-item" style="display: none;">keyboard_arrow_down</i><i class="material-icons toggle-category-item">keyboard_arrow_right</i><span class="list-title">Debug</span></span></a></p>\
			<div class="#{root}-tab-list-debug toggle-category-item" style="display: none;"></div>\
		</div>\
		</div></div>\
	</div>\
	<div class="#{root}-mainpanel-wrapper #{root}-tabs-content"></div>\
	<div style="clear: both;"> </div>\
	<footer>Home made jukebox over streaming - <a href="#{milestoneUrl}" target="_blank">#{milestoneName}</a></footer>\
</div>',
		tabs:
		{
			AccountTab:
			{
				main:
'<p class="#{root}-tab-title">Informations personnelles de #{user}</p>\
<div class="#{root}-account-informations">\
	<ul>\
		<li><b>user:</b>#{user}</li>\
		<li><b>token:</b>#{token}</li>\
		<li><b>home:</b>#{home}</li>\
		<li><b>sid:</b>#{sid}</li>\
		<li><b>ip:</b>#{ip}</li>\
		<li><b>user agent:</b>#{userAgent}</li>\
	</ul>\
</div>\
<div class="#{root}-account-change-password">\
<h2>Changer de mot de passe</h2>\
<table>\
<tbody>\
	<tr><td>Ancien mot de passe : </td><td><input class="#{root}-account-old-password" type="password" /></td></tr>\
	<tr><td>Nouveau mot de passe : </td><td><input class="#{root}-account-new-password" type="password" /></td></tr>\
	<tr><td>Confirmer le nouveau mot de passe : </td><td><input class="#{root}-account-new-password2" type="password" /></td></tr>\
</tbody>\
</table>\
<input class="#{root}-account-change-password-submit" type="submit" value="Valider"/></br> \
</div> \
<div class="#{root}-account-available-rights"></div>\
<div class="#{root}-user-header-create">\
		Créer un compte :<br/>\
		<table>\
		<tbody>\
			<tr><td>Identifiant : </td><td><input type="text" class="#{root}-user-header-create-nickname" size="10" value="" /></td></tr>\
			<tr><td>Mot de passe : </td><td><input type="password" class="#{root}-user-header-create-password" size="10"/></td></tr>\
			<tr><td>Confirmer le mot de passe : </td><td><input type="password" class="#{root}-user-header-create-password2" size="10"/></td></tr>\
		</tbody>\
		</table><br />\
		<input type="submit" class="#{root}-user-header-create-submit" value="Créer">\
	</div> \
	<div class="#{root}-user-header-canal">\
	#{canalLabel} <br/> \
<input type="text" class="#{root}-channel" /><input type="button" class="#{root}-channel-button" value="#{canalValue}" />\
	</div>',
				rights_controller:
'TODO : Right controller part',
				rights_header:
'TODO right header part',
				rights_list:
'TODO list rights',
				rights_footer:
'TODO footer rights'
			},
			UploadTab:
			{
				main:
'<p class="#{root}-tab-title">#{title}</p>\
<div class="#{root}-file-uploader"></div>\
<div class="#{root}-uploaded-files"></div>',
				tableController:
'<select class="#{root}-upload-global-action-select">\
	<option value="artist">Artist</option>\
	<option value="album">Album</option>\
	<option value="year">Year</option>\
	<option value="trackNb">TrackNb</option>\
	<option value="genre">Genre</option>\
	<option value="fillfromfilename">Fill title with filename</option>\
	<option value="delete">Delete</option>\
	<option value="update">Update</option>\
	<option value="validate">Validate</option>\
</select>\
<input class="#{root}-upload-global-action-input" type="text" value="" />\
<select class="#{root}-upload-global-action-genre-select" ></select>\
<select class="#{root}-upload-global-action-fill-dst" >\
	<option value="title">Title</option>\
	<option value="album">Album</option>\
	<option value="artist">Artist</option>\
	<option value="track">Track</option>\
</select>\
<input class="#{root}-upload-global-min-idx" type="text" value="min" size=4/>\
<input class="#{root}-upload-global-max-idx" type="text" value="max" size=4/>\
<input class="#{root}-upload-global-submit" type="submit" value="Appliquer" />',
				tableHead:
'<tr>\
	<th class="#{root}-upload-selector">\
		<input class="#{root}-upload-selector-checkbox" type="checkbox" />\
	</th>\
	<th class="#{root}-upload-filename">Filename</th>\
	<th class="#{root}-upload-artist">Artist</th>\
	<th class="#{root}-upload-album">Album</th>\
	<th class="#{root}-upload-title">Title</th>\
	<th class="#{root}-upload-year">Year</th>\
	<th class="#{root}-upload-track">Track</th>\
	<th class="#{root}-upload-trackNb">TrackNb</th>\
	<th class="#{root}-upload-genre">Genre</th>\
	<th class="#{root}-upload-actions">Actions</th>\
</tr>',
				tableBody:
'<tr id="#{rowId}">\
	<td class="#{root}-upload-cell-static"><input class="#{root}-upload-cell-checkbox" type="checkbox" /></td>\
	<td class="#{root}-upload-cell-static #{root}-upload-cell-filename">#{filename}</td>\
	<td class="#{root}-upload-cell-artist">#{artist}</td>\
	<td class="#{root}-upload-cell-album">#{album}</td>\
	<td class="#{root}-upload-cell-title" >#{title}</td>\
	<td class="#{root}-upload-cell-year">#{year}</td>\
	<td class="#{root}-upload-cell-track">#{track}</td>\
	<td class="#{root}-upload-cell-trackNb">#{trackNb}</td>\
	<td class="#{root}-upload-cell-genre">#{genre}</td>\
	<td class="#{root}-uploaded-file-actions #{root}-upload-cell-static">\
		<a href="javascript:;" class="#{root}-uploaded-file-delete">X</a>\
		<a href="javascript:;" class="#{root}-uploaded-file-update" style="display:none;">Update</a>\
		<a href="javascript:;" class="#{root}-uploaded-file-validate">Validate</a>\
	</td>\
</tr>'
			},
			SearchTab:
			{
				main:
'<p class="#{root}-tab-title">#{title}</p>\
<div class="#{pagelistClass}">\
	\\#{links}\
	\\#{slider}\
</div>\
<div class="#{contentClass} song-list"></div>',
				controlButton: '<span class="#{root}-#{name}"><i class="material-icons">#{icon}</i></span>'
			},
			PlayQueueTab:
			{
				main:
'<p class="#{root}-tab-title">#{title}</p>\
<div class="#{root}-playqueue">\
<div class="#{root}-playqueue-content song-list">\
</div>\
</div>',
				controlButton: '<span class="#{root}-#{name}"><i class="material-icons">#{icon}</i></span>'
			}
		}
	}
};
