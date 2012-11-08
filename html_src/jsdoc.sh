#!/bin/bash

jsDocPath=~/gitprojects/jsdoc

pwd=`pwd`
outFolder=$pwd/doc/
files=( jukebox.js jukeboxUI.js action.js notifications.js query.js tools.js)

rm -rf $outFolder

echo Generating documentation into: $outFolder


filesList=
for file in "${files[@]}"
do
	filesList="${filesList} js/${file}"
done

$jsDocPath/jsdoc --verbose --destination ${outFolder} ${filesList}

echo Done
