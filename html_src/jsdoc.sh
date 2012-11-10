#!/bin/bash

jsDocPath=~/gitprojects/jsdoc
template=${jsDocPath}/templates/default
dir=`dirname $0`

outFolder=${dir}/doc/
readme=${dir}/../README.md
filesFolder=${dir}/js/
files=(jukebox.js jukeboxUI.js action.js notifications.js query.js tools.js)

# Clean previous documentation
rm -rf $outFolder

# Compute file list
filesList=
for file in "${files[@]}"
do
	filesList="${filesList} ${filesFolder}${file}"
done

echo Generating documentation into: $outFolder

$jsDocPath/jsdoc --template $template --destination ${outFolder} ${filesList} ${readme}

if [ ! -d "$outFolder" ]; then
	echo "ERROR: at least one input file is missing? javascript error (check with: grunt lint)?"
else
	echo "Done"
fi
