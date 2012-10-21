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
%ajaxmin% -analyze tab/tabs.js ^
	-global:$,Class,Element ^
	1>NUL 2>>%log%
%ajaxmin% -analyze tab/search.js ^
	-global:$,$$,$R,Class,Control,Tab,TableKit,Draggable,Element,genres ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze musicFieldEditor.js ^
	-global:$,$$,Event,TableKit,UploadTab,genres,genresOrdered ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze tab/upload.js ^
	-global:$,$$,JSON,qq,Class,Tab,TableKit,MusicFieldEditor,Notifications,genres,Element ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze tab/debug.js ^
	-global:$,Class,Tab,JSON ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze tab/customQueries.js ^
	-global:$,Class,Tab,JSON,Notifications ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze tab/notification.js ^
	-global:$,Element,Effect,Event,Class,Tab ^
	1>NUL 2>>%log%%
%ajaxmin% -analyze jukebox.js ^
	-global:$,$$,$R,Control,Ajax,$F,Event,Element,JSON,Droppables,Draggable,Tabs,SearchTab,UploadTab,DebugTab,Notifications,NotificationTab,CustomQueriesTab,Sound,genres,genresOrdered ^
	1>NUL 2>>%log%%

ECHO Analysis done in %log%