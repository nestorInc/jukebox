@ECHO OFF

SET log=analyze.txt
DEL %log%

:: Download Ajax Minifier here: http://ajaxmin.codeplex.com/
SET ajaxmin="C:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\AjaxMin.exe"

:: Also checkout UglifyJS (require nodejs): https://github.com/mishoo/UglifyJS
:: Also checkout YUI Compressor: http://developer.yahoo.com/yui/compressor/

:: 1>NUL		Dismiss minification result
:: 2>>%log%		Add analysis infos to log

%ajaxmin% -analyze genres.js 1>NUL 2>>%log%
%ajaxmin% -analyze tabs.js ^
	-global:$,Class ^
	1>NUL 2>>%log%
%ajaxmin% -analyze library.js ^
	-global:$,JSON,Droppables ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze search.js ^
	-global:$,$$,$R,Class,Control,Tab,TableKit,Draggable ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze MusicFieldEditor.js ^
	-global:$,$$,Event,TableKit,UploadTab ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze upload.js ^
	-global:$,$$,JSON,qq,Class,Tab,TableKit,MusicFieldEditor,Notifications ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze debug.js ^
	-global:$,Class,Tab ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze customQueries.js ^
	-global:$,Class,Tab ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze notification.js ^
	-global:$,Element,Effect,Event,Class,Tab ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze StreamPlayer.js ^
	-global:$ ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze jukebox.js ^
	-global:$,$$,Ajax,$F,Event,JSON,Droppables,Draggable,Tabs,SearchTab,UploadTab,DebugTab,Notifications,NotificationTab,CustomQueriesTab ^
	1>NUL 2>>%log%%

ECHO Analysis done in %log%