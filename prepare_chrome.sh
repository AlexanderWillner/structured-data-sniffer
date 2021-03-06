#!/bin/bash
EXT_DIRNAME=./OSDS_Chrome
EXT_SRC=./src

rm -rf $EXT_DIRNAME

mkdir -pv $EXT_DIRNAME


SRC_DIR=./
DST_DIR=$EXT_DIRNAME

#copy info files
for I_DIR in AUTHORS COPYING CREDITS; do
  cp -va $SRC_DIR/$I_DIR $DST_DIR/
done


SRC_DIR=$EXT_SRC
DST_DIR=$EXT_DIRNAME

#copy common files
for I_DIR in handlers.js html_gen.js options.js panel.js settings.js sniffer.css sniffer.js; do
  cp -va $SRC_DIR/$I_DIR $DST_DIR/
done

#copy Chrome related files
for I_DIR in browser.js options.html panel.html; do
  cp -va $SRC_DIR/$I_DIR $DST_DIR/
done

cp -va $SRC_DIR/manifest.json $DST_DIR/


for I_DIR in images lib; do
  mkdir $DST_DIR/$I_DIR
  tar --exclude 'original' -cf - -C $SRC_DIR/$I_DIR .|tar -xf - -C $DST_DIR/$I_DIR
done

