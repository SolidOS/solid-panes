# Wrap TTL files into JS files for bundling with library

,all : formsForSchedule.js

formsForSchedule.js : formsForSchedule.ttl
				(echo 'module.exports = `' ; cat formsForSchedule.ttl; echo '`') >  formsForSchedule.js
