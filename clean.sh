#!/bin/bash

DIR=`pwd`

# Ensure correct path even if we're called from elsewhere
SCRIPT_PATH=${BASH_SOURCE[0]}
cd `dirname ${SCRIPT_PATH}` > /dev/null


# Destroy time

rm -f jukebox.db
echo "Database removed!"

rm -rf encoded/
mkdir encoded
echo "Folder encoded/ is now empty!"


# Restore dir
cd $DIR
