#!/bin/sh
# This is a truly heinous hack, but it works pretty nicely.
# Find all modules we're requiring---even conditional requires.

grep "require('" src/ bin/ -R |
    grep '.js:' |
    sed "s/.*require('\([^'\/]*\).*/\1/" |
    grep -v '^\.' |
    sort |
    uniq
