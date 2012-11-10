# Jukebox

Home made jukebox over streaming.


The jukebox is composed of a server component, currently in ruby, and a web client.
Please note that the website is directly hosted by the ruby application, no web server is required.

Web-client rely on HTML5 audio api, or flash, depending on your browser.
Client side pass jslint & ajaxmin checks.
A documentation is generated.

## Installation

The server installation is mandatory.
Web client installation is facultative (only if you wish to develop html/js).

* [Server installation tutorial](ServerInstallation)
* [Web client installation tutorial](gruntjs)

## Start/Stop the server

Start:

	ruby jukebox.rb

Stop:

	Ctrl + C

## Listen

From a browser:

	http://<host>:<port>/

See your jukebox.cfg for port.

From any player:

	http://<host>:<port>/stream

With credentials:

	http://user:pass@<host>:<port>/stream
